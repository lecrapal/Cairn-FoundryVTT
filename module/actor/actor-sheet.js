/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CairnActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cairn", "sheet", "actor"],
      template: "systems/cairn/templates/actor/actor-sheet.html",
      width: 480,
      height: 480,
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".content",
          initial: "items",
        },
      ],
    });
  }

  get template() {
    const path = "systems/cairn/templates/actor";
    return `${path}/${this.actor.type}-sheet.html`;
  }

  /** @override */
  async getData(options) {

    // The Actor's data
    const actorData = this.actor.toObject(false);

    const context = {
      actor: actorData,
      system: actorData.system,
      items: actorData.items,
      options: this.options,
    };

    // Ordering items
    context.items.sort((a, b) =>
      b.system.equipped - a.system.equipped ||
      a.name.localeCompare(b.name),
    );

    return context;
  }

  /** @override */
  activateListeners(html) {

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) {
      return;
    }

    // Add inventory item
    html.find(".item-create").click(this._onItemCreate.bind(this));

    // Update inventory item
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".cairn-items-list-row");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete inventory item
    html.find(".item-delete").click(this._onItemDelete.bind(this));

    html.find(".roll-control").click(this._onRoll.bind(this));

    // Rollable abilities
    html.find(".resource-roll").click(this._onRollAbility.bind(this));

    // Rest restores HP
    html.find("#rest-button").click(async (ev) => {
      // Someone DEPRIVED of a crucial need (e.g. food,water or warmth) cannot
      // benefit from RESTS
      if (!this.actor.system.deprived) {
        await this.actor.update({
          "system.hp.value": this.actor.system.hp.max,
        });
      }
    });

    html.find("#restore-abilities-button").click(async (ev) => {
      if (!this.actor.system.deprived) {
        await this.actor.update({
          "system.abilities.STR.value": this.actor.system.abilities.STR.max,
        });
        await this.actor.update({
          "system.abilities.DEX.value": this.actor.system.abilities.DEX.max,
        });
        await this.actor.update({
          "system.abilities.WIL.value": this.actor.system.abilities.WIL.max,
        });
      }
    });

    html
      .find(".cairn-item-title")
      .click((event) => this._onItemDescriptionToggle(event));

    html.find("#die-of-fate-button").click(async (ev) => {
      let roll = new Roll("1d6");
      roll.roll({ async: false }).toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: "Die of Fate",
      });
    });

    // Handle default listeners last so system listeners are triggered first
    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.type;
    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }

  async _onItemDelete(event) {
    const li = event.currentTarget.closest(".cairn-items-list-row");
    const item = this.actor.items.get(li.dataset.itemId);
    if ( !item ) return;
    this.render(false);
    return item.delete();
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.roll) {
      const roll = new Roll(dataset.roll, this.actor.system);
      const label = dataset.label ? game.i18n.localize("CAIRN.Rolling") + ` ${dataset.label}` : "";
      roll.roll({ async: false }).toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
      });
    }
  }

  _onItemDescriptionToggle(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".cairn-items-list-row");
    const item = this.actor.items.get(li.dataset.itemId);
    if (li.hasClass("expanded")) {
      let summary = boxItem.children(".item-description");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(
        `<div class="item-description">${item.system.description}</div>`
      );
      li.append(div.hide());
      div.slideDown(200);
    }
    boxItem.toggleClass("expanded");
  }

  _onRollAbility(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.roll) {
      const roll = new Roll(dataset.roll, this.actor.system);
      const label = dataset.label ? game.i18n.localize("CAIRN.Rolling") + ` ${dataset.label}` : "";
      const rolled = roll.roll({ async: false });

      const formula = rolled._formula;
      const rolled_number = rolled.terms[0].results[0].result;
      if (rolled.result === "0") {
        rolled.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: label,
          content: `<div class="dice-roll"><div class="dice-result"><div class="dice-formula">${formula}</div><div class="dice-tooltip" style="display: none;"><section class="tooltip-part"><div class="dice"><header class="part-header flexrow"><span class="part-formula">${formula}</span></header><ol class="dice-rolls"><li class="roll die d20">${rolled_number}</li></ol></div></section></div><h4 class="dice-total failure">Fail (${rolled_number})</h4</div></div>`,
        });
      } else {
        rolled.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: label,
          content: `<div class="dice-roll"><div class="dice-result"><div class="dice-formula">${formula}</div><div class="dice-tooltip" style="display: none;"><section class="tooltip-part"><div class="dice"><header class="part-header flexrow"><span class="part-formula">${formula}</span></header><ol class="dice-rolls"><li class="roll die d20">${rolled_number}</li></ol></div></section></div><h4 class="dice-total success">Success (${rolled_number})</h4</div></div>`,
        });
      }
    }
  }
}
