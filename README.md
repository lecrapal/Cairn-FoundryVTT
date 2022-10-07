# Cairn for FoundryVTT!

Implements basic character and item sheets for playing [Cairn](https://cairnrpg.com) by [Yochai Gal](https://newschoolrevolution.com) in Foundry VTT. Cairn is a mashup of Knave and Into The Odd, meant for Wood Fantasy settings such as Necrotic Gnome's [Dolmenwood](https://necroticgnome.com/collections/dolmenwood).

The code is based on the [Electric Bastionland system](https://github.com/mvdleden/electric-bastionland-FoundryVTT/) for FoundryVTT (which in turn is based on the Into the Odd System).

## Installation - Auto Installer (Recommended)

1. In the FVTT Game Systems Menu, click `Install System`
2. Search for "Cairn" in the package search filter.
4. Grant player Observer permissions to the macro and to the items imported so they can view items clicked in chat.
5. Allow player permissions to "creator actor".

## Installation - Manual

1. In the FVTT Game Systems Menu, click `Install System`
2. Enter the Manifest URL: `https://raw.githubusercontent.com/yochaigal/Cairn-FoundryVTT/master/system.json`
3. Follow steps 3-5 in the Auto Installer above.

## Contributing

If you want to contribute to this sheet, you'll need to clone this repository in the `systems` directory in Foundry VTT data path.

Please note that the directory needs to be named `cairn` in order to be properly detected by Foundry VTT (i.e. it needs to look like `Data\systems\cairn`).

## Patch Notes

### FoundryVTT v10 compatible

* Generate Character Macro compatible v10
* Item sheet compatible v10
* Actor sheet compatible v10

### Generate Character Macro rebuild

* No need to import compendiums to use Generate Character Macro, it takes data from compendiums
* Use the same random tables as SRD

### Actor Sheet Features

* Items ordered by equipped/not equipped and alphabetical order
* Default HP set to 6 (not 10)

### Containers

* Containers have been added to the compendium
