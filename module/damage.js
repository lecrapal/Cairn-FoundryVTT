export class Damage {

  /**
   * @description Apply damage to several tokens
   * @param {String[]} targets Array of Id of the targeted tokens
   * @param {Number} damage Positive number
   */
  static applyToTargets (targets, damage) {
    targets.forEach(target => {
      const data = this.applyToTarget(target, damage)
      this._showConsequence(data)
    })
  }

  /**
   * @description Apply damage to one token
   * @param {*} target Id of one token
   * @param {*} damage Amount of damaage
   * @returns tokenDoc + old and new values
   */
  static applyToTarget (target, damage) {
    const tokenDoc = canvas.scene.tokens.get(target)
    // Linked to Actor
    if (tokenDoc.isLinked) {
      const armor = tokenDoc.actor.system.armor
      const hp = tokenDoc.actor.system.hp.value
      const str = tokenDoc.actor.system.abilities.STR.value

      let { dmg, newHp, newStr } = this._calculateHpAndStr(damage, armor, hp, str)

      tokenDoc.actor.update({ 'system.hp.value': newHp, 'system.abilities.STR.value': newStr })

      return { tokenDoc, dmg, damage, armor, hp, str, newHp, newStr }
    }
    // Synthetic actor
    else {
      let armor = tokenDoc.actorData?.system?.armor
      if (armor === undefined) armor = tokenDoc.actor.system.armor

      let hp = tokenDoc.actorData?.system?.hp?.value
      if (hp === undefined) hp = tokenDoc.actor.system.hp.value

      let str = tokenDoc.actorData?.system?.abilities?.STR?.value
      if (str === undefined) str = tokenDoc.actor.system.abilities.STR.value

      let { dmg, newHp, newStr } = this._calculateHpAndStr(damage, armor, hp, str)
      tokenDoc.modifyActorDocument({ 'system.hp.value': newHp, 'system.abilities.STR.value': newStr })

      return { tokenDoc, dmg, damage, armor, hp, str, newHp, newStr }
    }
  }

  /**
   * @description Apply damage to a target token based on the token's id
   * @param {*} event
   * @param {*} html
   * @param {*} data
   */
  static onClickChatMessageApplyButton (event, html, data) {
    const btn = $(event.currentTarget)
    const targets = btn.data('targets')

    let targetsList = targets.split(';')

    // Shift Click allow to target the targeted tokens
    if (event.shiftKey) {
      for (let index = 0; index < targetsList.length; index++) {
        const target = targetsList[index]
        const token = canvas.scene.tokens.get(target).object
        const releaseOthers = (index == 0 ? (!token.isTargeted ? true : false) : false)
        const targeted = !token.isTargeted
        token.setTarget(targeted, { releaseOthers: releaseOthers })
      }
    }
    // Apply damage to targets
    else {
      if (targets !== undefined) {
        const dmg = parseInt(html.find('.dice-total').text())
        this.applyToTargets(targetsList, dmg)
      }
    }
  }

  /**
   * @description Damage are reduced by armor, then apply to HP, and then to STR if not enough HP
   * @param {*} damage
   * @param {*} armor
   * @param {*} hp
   * @param {*} str
   * @returns new HP value and STR value
   */
  static _calculateHpAndStr (damage, armor, hp, str) {
    let dmg = damage - armor
    if (dmg < 0) dmg = 0

    let newHp
    let newStr = str
    if (dmg <= hp) {
      newHp = hp - dmg
      if (newHp < 0) newHp = 0
    } else {
      newHp = 0
      newStr = str - (dmg - hp)
      if (newStr < 0) newStr = 0
    }

    return { dmg, newHp, newStr }
  }

  /**
   *
   * @param data
   * @private
   */
  static _showConsequence (data) {

    const { tokenDoc, dmg, damage, armor, hp, str, newHp, newStr } = data

    let content = '<p><strong>' + game.i18n.localize('CAIRN.Damage') + '</strong>: ' + dmg + ' (' + damage + '-' + armor + ')</p>'
    if (newHp !== hp) {
      content += '<p><strong>' + game.i18n.localize('CAIRN.HitProtection') + '</strong>: <s>' + hp + '</s> => ' + newHp + '</p>'
    } else {
      content += '<p><strong>' + game.i18n.localize('CAIRN.HitProtection') + '</strong>: ' + hp + '</p>'
    }
    if (newStr !== str) {
      content += '<p><strong>' + game.i18n.localize('STR') + '</strong>: <s>' + str + '</s> => ' + newStr + '</p>'
    }

    if (newStr < str) {
      if (newStr === 0) {
        content += '<strong>' + game.i18n.localize('CAIRN.Dead') + '</strong>'
      } else  {
        content += '<strong>' + game.i18n.localize('CAIRN.StrSave') + '</strong>'
      }
    } else if (newHp === 0 && hp !== 0) {
      content += '<strong>' + game.i18n.localize('CAIRN.Scars') + '</strong>'
    }

    ChatMessage.create({
      user: game.user._id,
      speaker: { alias: tokenDoc.name },
      content: content,
    }, {})

  }
}
