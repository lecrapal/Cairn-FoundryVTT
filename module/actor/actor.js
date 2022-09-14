/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class CairnActor extends Actor {
	/**
	 * Augment the basic actor data with additional dynamic data.
	 */
	prepareData() {
		super.prepareData();
		const actor = this; // Not sure actorData is to spec.

		// Make separate methods for each Actor type (character, npc, etc.) to keep
		// things organized.
		if (actor.type === "character") this._prepareCharacterData(actor);
		if (actor.type === "npc") this._prepareNpcData(actor);
		if (actor.type === "container") this._prepareContainerData(actor);
	}

	/**
	 * Prepare Character type specific data
	 */
	_prepareCharacterData(actor) {
		actor.system.armor = actor.items
			.filter((item) => item.type == "armor" || item.type == "item")
			.map((item) => item.system.armor * item.system.equipped)
			.reduce((a, b) => a + b, 0);

		actor.system.slotsUsed = calcSlotsUsed(this.items);

		actor.system.encumbered = actor.system.slotsUsed >= 10;

		if (actor.system.encumbered) {
			actor.system.hp.value = 0;
		}
		if (actor.system.armor > 3) {
			actor.system.armor = 3;
		}
	}

	_prepareNpcData(actor) {

		let itemArmor = actor.items
			.filter((item) => item.type == "armor" || item.type == "item")
			.map((item) => item.system.armor * item.system.equipped)
			.reduce((a, b) => a + b, 0);

		actor.system.armor = Math.max(itemArmor, actor.system.armor);
		if (actor.system.armor > 3) {
			actor.system.armor = 3;
		}
	}

	_prepareContainerData(actorData) {
		actorData.system.slotsUsed = calcSlotsUsed(this.items);
	}

	/** @override */
	getRollData() {
		const data = super.getRollData();
		// Let us do @str etc, instead of @abilities.str.value
		for (const [k, v] of Object.entries(data.abilities)) {
			if (!(k in data)) data[k] = v.value;
		}
		return data;
	}

	getOwnedItem(itemId) {
		return this.getEmbeddedDocument("Item", itemId);
	}

	createOwnedItem(itemData) {
		this.createEmbeddedDocuments("Item", [itemData]);
	}

	/** No longer an override as deleteOwnedItem is deprecated on type Actor */
	deleteOwnedItem(itemId) {
		const item = this.items.get(itemId);
		const currentQuantity = item.system.quantity;
		if (item) {
			if (currentQuantity > 1) {
				item.update({
					"system.quantity": currentQuantity - 1,
				});
			} else {
				item.delete();
			}
		} else {
			ui.notifications.error(game.i18n.localize("CAIRN.NoItemToDelete"));
		}
	}
}

function calcSlotsUsed(actorItems) {
  const milliSlots = actorItems
		.map((item) => {
			const milliSlots = item.system.slots * 1000;
			const itemSlotPercentage = (item.system.quantity || 1) * milliSlots;
			return Math.trunc(itemSlotPercentage);
		})
		.reduce((memo, slots) => memo + slots, 0);
	return milliSlots / 1000;
}
