# Neuro-Vegas
NeuroVegas is a mod for Fallout: New Vegas that adds Neuro-sama/Evil Neuro as a custom companion, this mod also includes neuro integration via the [Neuro Game SDK](https://github.com/VedalAI/neuro-game-sdk), allowing Neuro to perform certain actions in-game and be fed context on whats happening.

If you have any questions or concerns regarding the mod you can message me on discord (@noellepunk)

Before you try reporting any issues with the mod, please ensure that you followed the installation steps correctly and check that the issue isnt being caused by a conflict with another mod.

![Screenshot1](/screenshots/screenie1.png?raw=true)

![Screenshot2](/screenshots/screenie2.png?raw=true)

![Screenshot3](/screenshots/screenie3.png?raw=true)

![Screenshot4](/screenshots/screenie4.png?raw=true)

![Screenshot5](/screenshots/screenie5.png?raw=true)

# Installation
This mod REQUIRES:

All of the expansion [DLCs](https://store.steampowered.com/sub/13435/) for Fallout: New Vegas

[New Vegas Script Extender (xNVSE)](https://github.com/xNVSE/NVSE/releases/)

[JIP LN NVSE Plugin](https://www.nexusmods.com/newvegas/mods/58277)

[JohnnyGuitar NVSE](https://www.nexusmods.com/newvegas/mods/66927)

[ShowOff xNVSE Plugin](https://www.nexusmods.com/newvegas/mods/72541)

[AnhNVSE](https://www.nexusmods.com/newvegas/mods/74012)

If you are attempting to install this mod on a fresh installation of New Vegas, I highly recommend using the vanilla portion of [Viva New Vegas](https://vivanewvegas.moddinglinked.com/) as your base for maximum stability and minimal issues.


1. Download the latest version of the mod from the Releases tab
2. Install the mod through your mod manager, if you are not using a mod manager (which you really should be) then place everything inside the `NeuroVegas` folder within the zip file into the `Data` folder in your New Vegas directory
3. If you plan on using the neuro integration part of this mod then download the NeuroVegasClient from this repository (if not then, open the `NeuroConfig.ini` file located at `Data\Config\NeuroConfig.ini` and set EnableNeuroIntegration from 1 to 0 and enjoy!)
5. Within the NeuroVegasClient folder, open the `config.ini` file and set the directory of your New Vegas installation and the websocket URL you wish to connect to
6. Run `npm install` in the NeuroVegasClient folder
7. Run `npm start` in the NeuroVegasClient folder (make sure the websocket connection is open before running!)
8. Once the NeuroVegas client is up and running, open the game and enjoy! (running the NeuroVegas program after you have already loaded a save may potentially cause issues!)

# How the mod works
The neuro integration is achieved via middleware written in JavaScript, the program and the mod primarily communicate by reading/writing to text files.

Actions that Neuro can perform: 
- Saving the game (these are treated as autosaves)
- Checking her current health (includes what limbs are broken, if any)
- Checking whats currently in her inventory
- Change combat mode (combat mode can either be offensive or defensive. if set to offensive she will attack all enemies on sight, if set to defensive she will only attack in self-defense, useful for stealth)
- Equipping/unequipping weapons from her inventory (if a weapon in her inventory uses ammo but she does not have any, she will not be able to equip it)
- Swap ammo types (if she has any)
- Use consumable items and benefit from their effects (if she has any)
- Stop/resume following the player
- Jump (because why not)

Due to how NPC scripts work in the game engine, if Neuro performs an action while the player is in a menu (i.e pipboy/neuro's interaction menu), an action result will not be sent until the player exits the menu.

Neuro is prevented from performing certain actions whenever:
- The player is on the main menu
- The game is paused
- The player is dead
- Neuro is unsconscious
- The player is currently in dialogue with another NPC
- The player is currently watching a cutscene (ending slide/DLC intro)


Neuro is also given context on:
- Whenever the player is on the main menu
- Whenever a save is first loaded (includes current location and the status of her character, will not be sent if any saves are loaded afterwards)
- NPC Dialogue and player responses (only includes dialogue that puts the player into the dialogue menu)
- Whenever the current quest/quest objectives change
- Whenever the current active quest is failed/completed
- Whenever the current location changes (includes current time and whether or not she is indoors or outdoors)
- Whenever the Neuro companion initiates combat against an NPC
- Whenever the player kills an enemy
- Whenever combat ends
- Whenever her health reaches 0 and she gets knocked unconscious
- Whenever she regains consciousness/the player revives her
- Whenever the player levels up
- Whenever the player heals her
- Whenever the player forces her to stop/resume following
- Whenever the player dies (sends a simplified version of the startup context when a save is loaded afterwards)
- Whenever the player sits down somewhere (this will make the neuro companion search for a place to sit down next to the player)
- Whenever her current weapon runs out of ammo (if this happens and neuro has other weapons in her inventory to equip, she will be sent an action force to equip a new one)
- Whenever the game closes

Other features of the mod:
- Neuro will level up alongside the player and share all skills, special stats, and perks
- Neuro can use any weapons as long as they are in her inventory
- Neuro's presence will not prevent you from recruiting any of the vanilla companions, she will also travel with you to all of the DLC's
- Custom interact menu that allows you to open her inventory, heal her with scrap metal, and force her to stop/resume following
- Customizable configuration file that allows you to switch to Evil Neuro and also disable neuro integration if you wish to play without it (neuro companion will not function properly otherwise)

# Known Issues/Limitations
This mod is not entirely perfect and there are some issues that I haven't been able to fix

- Sometimes player kill context will fail to send, most commonly occurs when an enemy is killed from far away or a group of enemies are bunched up close together
- Sometimes dialogue context will fail to send, most commonly occurs when an actor is talking through an object (i.e radio or intercom), but otherwise it is *somewhat* rare
- Sometimes dialogue context will be incorrect, most commonly occurs when purchasing something from a vendor
- Due to how bright Neuro's textures are, she will start glowing like crazy whenever she is directly facing the sun, this can technically be fixed by disabling HDR in the game's preferences file but this also makes the game look significally worse so I personally recommend against it
- If Neuro Integration is enabled, whenever Neuro has a throwable weapon equipped, she will never run out during combat (It is kinda funny to watch Neuro endlessly lob grenades at an enemy with no regard for anyone's safety so I consider this to be more of a feature)
- I also recommend keeping save-scumming to a minimum, as it may confuse Neuro if she is sent context about a quest shes already completed or an enemy shes already killed

# Credits
[Neuro Javascript SDK](https://github.com/AriesAlex/typescript-neuro-game-sdk) by AriesAlex

Neuro-sama 3D model by Fz3D
