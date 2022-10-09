const rollTableInventory = [
  // Armor
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Armor', withSubTable: false },
    item: { compendiums: ['cairn.armor'] }
  },
  // Weapons
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Weapons', withSubTable: true },
    item: { compendiums: ['cairn.weapons'] }
  },
  // Helmets & Shields
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Helmets and Shields', withSubTable: false },
    item: { compendiums: ['cairn.armor'] }
  },
  // Expeditionary Gear
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Expeditionary Gear', withSubTable: false },
    item: { compendiums: ['cairn.expeditionary-gear', 'cairn.containers'] }
  },
  // Tools
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Tools', withSubTable: false },
    item: { compendiums: ['cairn.tools'] }
  },
  // Trinkets
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Trinkets', withSubTable: false },
    item: { compendiums: ['cairn.trinkets'] }
  },
  // Bonus Item
  {
    rolltable: { compendium: 'cairn.gear-tables', table: 'Bonus Item', withSubTable: true },
    item: {
      compendiums: ['cairn.expeditionary-gear', 'cairn.armor', 'cairn.weapons',
        'cairn.tools', 'cairn.trinkets', 'cairn.spellbooks', 'cairn.containers']
    }
  }
]

/**
 * Retrieve rolled items
 * @param rollItems
 * @param actorData
 * @returns {Promise<{actors: *[], items: *[]}>}
 */
async function rollInventory (rollItems, actorData) {
  const results = { items: [], actors: [] }

  for (const rollItem of rollItems) {
    const tableResults = await getCompendiumTableAndRoll(rollItem.rolltable.compendium, rollItem.rolltable.table)
    for (const tableResult of tableResults) {
      // Result is a link to a subtable
      if (rollItem.rolltable.withSubTable) {
        const subTableResults = await getCompendiumTableAndRoll(rollItem.rolltable.compendium, tableResult.text)
        for (const subTableResult of subTableResults) {
          // Not an item
          if (subTableResult.documentId !== null) {
            const document = await findCompendiumDocument(rollItem.item.compendiums, subTableResult.text)
            const convertedDoc = convertDocumentForImport(document, actorData.name)
            if (convertedDoc.type === 'item') {
              results.items.push(convertedDoc.document)
            }
            if (convertedDoc.type === 'actor') {
              results.actors.push(convertedDoc.document)
            }
          }
        }
      } else {
        const document = await findCompendiumDocument(rollItem.item.compendiums, tableResult.text)
        const convertedDoc = convertDocumentForImport(document, actorData.name)
        if (convertedDoc.type === 'item') {
          results.items.push(convertedDoc.document)
        }
        if (convertedDoc.type === 'actor') {
          results.actors.push(convertedDoc.document)
        }
      }
    }
  }
  return results
}

/**
 * Convert document before import, to rename actor's container for ex.
 * @param document
 * @param characterName
 * @returns {{document, type: string}|{document: string | (() => Promise<string>) | (() => string), type: string}|{document: *, type: string}}
 */
function convertDocumentForImport (document, characterName) {
  if (document?.constructor?.name === 'Item') {
    return { document: document.toObject(), type: 'item' }
  }
  if (document?.constructor?.name === 'CairnActor') {
    // Change name
    const actor = document.toObject()
    actor.name = game.i18n.format('CAIRN.OwnersItem', { owner: characterName, actor: actor.name })
    return { document: actor, type: 'actor' }
  }
  return { document: document, type: 'none' }
}

/**
 * Get name or original name of a document to make the macro usable with babele
 * @param document
 * @returns {string}
 */
function getOriginalName (document) {
  return (document.originalName !== undefined) ? document.originalName : document.name
}

/**
 * Try to find the document (item, actor, etc.) in a list of compendiums, or return null
 * @param compendiums
 * @param documentName
 * @returns {Promise<null|*>}
 */
async function findCompendiumDocument (compendiums, documentName) {
  for (const compendium of compendiums) {
    const pack = game.packs.get(compendium)
    const entry = pack.index.find(e => getOriginalName(e) === documentName)
    if (typeof entry !== 'undefined') {
      return await pack.getDocument(entry._id)
    }
  }
  return null
}

/**
 * Find a compendium rolltable and roll it !
 * @param compendium
 * @param tableName
 * @returns {Promise<*>}
 */
async function getCompendiumTableAndRoll (compendium, tableName) {
  const pack = game.packs.get(compendium)
  const entry = pack.index.find(e => getOriginalName(e) === tableName)
  return await pack.getDocument(entry._id).then(table => table.draw()).then(result => result.results)
}

// Used to get strength, dexterity and will
function totalDiceTermResults (diceTermResults) {
  return diceTermResults.reduce((total, diceTermResult) => total + diceTermResult.result, 0)
}

/************* CHAT MESSAGE *************/
function formResult (input, output) {
  return `<tr><td style='text-align:left'><b>${input}: </b></td><td>${output}</td></tr>`
}
function postCharToChat (actorData, items) {
  const statInsert = formResult(game.i18n.localize('CAIRN.Strength'), actorData.abilities.STR.max) +
    formResult(game.i18n.localize('CAIRN.Dexterity'), actorData.abilities.DEX.max) +
    formResult(game.i18n.localize('CAIRN.Will'), actorData.abilities.WIL.max) + '</table><table>' +
    formResult(game.i18n.localize('CAIRN.HitProtection'), actorData.hp.max) +
    formResult(game.i18n.localize('CAIRN.Gold'), actorData.gold) + '</table>'

  const statsMessage = `<table>${statInsert}</table>`
  const gearMessage = `<table><strong>${game.i18n.localize('CAIRN.Items')}</strong> : ${items.map(i => i.system.quantity > 1 ? `${i.system.quantity} ${i.name}` : i.name).join(', ')}</table>`
  const bioMessage = actorData.biography

  const charInsert = '@Actor[' + actorData.name + ']'

  const chatData = {
    user: game.user._id,
    speaker: ChatMessage.getSpeaker(),
    content: `<h2>${charInsert}</h2>` + statsMessage + gearMessage + bioMessage
  }
  ChatMessage.create(chatData, {})
}

/**
 * Create the new actor
 * @returns {Promise<void>}
 * @constructor
 */
async function Create () {
  // attributes
  const allroll = await new Roll('3d6[bloodmoon]+3d6[cold]+3d6[force]').roll({ async: true })
  const strength = totalDiceTermResults(allroll.dice[0].results)
  const dexterity = totalDiceTermResults(allroll.dice[1].results)
  const will = totalDiceTermResults(allroll.dice[2].results)

  // other stats
  const hp = new Roll('1d6').roll({ async: false }).total
  const gold = new Roll('3d6').roll({ async: false }).total
  const age = new Roll('2d10+10').roll({ async: false }).total

  // name
  const genderTable = Math.random() < 0.5 ? 'Male Names' : 'Female Names'
  const firstName = await getCompendiumTableAndRoll('cairn.character-traits', genderTable).then(e => e[0].text)

  const surname = await getCompendiumTableAndRoll('cairn.character-traits', 'Surnames').then(e => e[0].text)
  const characterName = firstName + ' ' + surname

  // biography
  const face = await getCompendiumTableAndRoll('cairn.character-traits', 'Face').then(e => e[0].text)
  const hair = await getCompendiumTableAndRoll('cairn.character-traits', 'Hair').then(e => e[0].text)
  const skin = await getCompendiumTableAndRoll('cairn.character-traits', 'Skin').then(e => e[0].text)
  const physique = await getCompendiumTableAndRoll('cairn.character-traits', 'Physique').then(e => e[0].text)
  const misfortune = await getCompendiumTableAndRoll('cairn.character-traits', 'Misfortunes').then(e => e[0].text)
  const reputation = await getCompendiumTableAndRoll('cairn.character-traits', 'Reputation').then(e => e[0].text)
  const speech = await getCompendiumTableAndRoll('cairn.character-traits', 'Speech').then(e => e[0].text)
  const vice = await getCompendiumTableAndRoll('cairn.character-traits', 'Vice').then(e => e[0].text)
  const virtue = await getCompendiumTableAndRoll('cairn.character-traits', 'Virtue').then(e => e[0].text)
  const clothing = await getCompendiumTableAndRoll('cairn.character-traits', 'Clothing').then(e => e[0].text)
  const characterBackground = await getCompendiumTableAndRoll('cairn.character-traits', 'Background').then(e => e[0].text)
  const biography = game.i18n.format('CAIRN.CharacterGeneratorBiography', {
    physique: physique,
    skin: skin,
    hair: hair,
    face: face,
    speech: speech,
    clothing: clothing,
    vice: vice,
    virtue: virtue,
    reputation: reputation,
    misfortune: misfortune,
    age: age
  })

  // Building actordata
  const actorData = {
    name: characterName,
    background: characterBackground,
    biography: `<p>${biography}</p><br/>`,
    hp: { value: hp, max: hp },
    gold: gold,
    abilities: {
      STR: {
        value: strength,
        max: strength
      },
      DEX: {
        value: dexterity,
        max: dexterity
      },
      WIL: {
        value: will,
        max: will
      }
    }
  }

  // Getting items
  let items = []

  let rations = await findCompendiumDocument(['cairn.expeditionary-gear'], 'Rations')
  rations = rations.toObject()
  rations.system.quantity = 3
  items.push(rations)

  const torch = await findCompendiumDocument(['cairn.expeditionary-gear'], 'Torch')
  items.push(torch.toObject())
  // Roll inventory
  const rolledResults = await rollInventory(rollTableInventory, actorData)
  items = items.concat(rolledResults.items)
  const actors = rolledResults.actors

  for (const actor of actors) {
    await Actor.create(actor)
  }

  const actor = Actor.create({
    name: characterName,
    type: 'character',
    img: 'icons/svg/mystery-man.svg',
    sort: 12000,
    data: actorData,
    token: {},
    flags: {}
  }).then(function (actor) {
    actor.createEmbeddedDocuments('Item', items)

    if (game.dice3d) {
      game.dice3d.showForRoll(allroll).then(happened => {
        postCharToChat(actorData, items)
      })
    } else {
      postCharToChat(actorData, items)
    }
  })
}


Create()
