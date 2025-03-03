//---------- NeuroVegas ----------
//
// This program acts as a middleware between Fallout: New Vegas and the Neuro game api 
// Basically, this program and the mod communicate with each other by reading/writing data via txt files
//
// Mod writes game data to text file -> This programs reads data from text file and does stuff depending on what it says (and vice versa for processing actions sent by neuro)
//
// Disclaimer: This code isn't very neat or efficient, but most of it works well enough
// (By reading this message you hereby agree to not judge me for my messy code (legally binding))


import { NeuroClient } from 'neuro-game-sdk'
import { writeFileSync, mkdirSync, watch, readFile, readFileSync, read, write } from 'fs';
import { dirname, parse } from 'path';
import ini from 'ini';
import psList from 'ps-list';

async function isProgramRunning(programName) {
  const processes = await psList();
  return processes.some(process => process.name.toLowerCase().includes(programName.toLowerCase()));
}

let isRunning = false;

let currentlevel = -1;

let currentquest = "0";
let questobjs = "0";

//#region Game Running Check
function checkGameRunning() {
  isProgramRunning('FalloutNV').then(isRunningNow => {
    if (isRunningNow) {
      if (!isRunning) {
        isRunning = true;
        console.log('[NeuroVegas] New Vegas is running.');
      }
    } else {
      if (isRunning) {
        isRunning = false;
        console.log('[NeuroVegas] New Vegas is not running.');
        writeDataToFile("-1","gamestate.txt" );
        writeDataToFile("-1","level.txt" );
        writeDataToFile("1","ignorelevelup.txt" );
        gamestate = -1;
        currentlevel = -1;
        currentquest = "0";
        questobjs = "0";
        if (startupcontextsent == 1) {
          neuroClient.sendContext("Fallout: New Vegas has been closed, please wait for the game to re-open.",true);
        }
        startupcontextsent = 0;
        ResetData();
        neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'set_combat_mode_to_defensive', 'set_combat_mode_to_offensive', 'check_inventory', 'save_game','check_health_status','check_inventory']);
      }
    }
  });
}


//#endregion
//parse config ini
const iniPath = './config.ini';

try {
  const iniContent = readFileSync(iniPath, 'utf-8'); // Read the file as a string
  const parsedini = ini.parse(iniContent); // Parse the ini file

  console.log('[NeuroVegas] Parsed Config INI : ', parsedini);
} catch (err) {
  console.error('Error reading ini file:', err.message);
}

/**
 * Parse a multi-line string into individual lines.
 * @param {string} multiLineString - The string with multiple lines.
 * @returns {Array<string>} - An array of lines from the string.
 */
function parseMultiLineString(multiLineString) {
  return multiLineString.split('\n').map(line => line.trim()); // Split and trim each line
}



const frameRate = 60; // Frames per second
const frameDuration = 1000 / frameRate; // Time per frame in ms

const iniCont = readFileSync(iniPath, 'utf-8'); // Read the file as a string
const parseini = ini.parse(iniCont); // Parse the ini file
const neurovegaspath = String(parseini.Config.FalloutNVPath) + '\\NeuroVegas\\';

//#region Variables
let playername = "NOT_CURRENTLY_DEFINED";
let currentlocation = "";

let questobjectives = [];
let currenthealth = -1;
let maxhealth = -1;

let validweapons = [];

let equipaiddata = "";
let wepdata = "";
let equipammodata = "";

let consumables = [];
let consumables_count = [];

let ammos = [];
let ammos_count = [];

let current_weapon = "";

let equippable_weapons = "";
let equippable_aid = "";
let equippable_ammo = "";

let behaviorstate = -1;
let forcefollow = 0;

let combatstate = 0;
let current_fleestate = 0;
let current_combatmode = 0;

let current_equipped_weapon = "";;

let startupcontextsent = 0;

let half_dmgwarning = 0;

let actor_is_speaking = 0;
let dialogue_string = "";
let dialogue = "";
let dialoguespeaker = "";
let dialogue_add = "";

let hostile_data = "";
let hostiles = "";
let nearbyhostiles = [];

let is_in_combat = 0;

let attack_data = "";
let kill_data = "";
let kill = [];

let playerattack_data = "";
let playerkill_data = "";
let playerkill = [];

let neuro_kill_id = 0;
let player_kill_id = 0;

let is_unconscious = 0;

let disable_writing = 0;

let weapon_action_force = 0;
let aid_action_force = 0;
let ammo_action_force = 0;

let inventoryopen = 0;

let is_paused = 0;

let playerdead = 0;

let dialogueresponse = "";

let is_sitting = 0;

let headhealth = 0;
let torsohealth = 0;
let leftarmhealth = 0;
let rightarmhealth = 0;
let leftleghealth = 0;
let rightleghealth = 0;

let currenttime = "";

let player_stole_neuros_kill = 0;

let indoors = 0;
//#endregion

writeDataToFile(String(disable_writing),"disable_writing.txt");

//#region Reset Data Function
function ResetData () {
  writeDataToFile("0","quest.txt");
  writeDataToFile("0","questobjectives.txt");
  writeDataToFile("0","weapon_to_equip.txt");
  writeDataToFile("0","ammo_to_equip.txt");
  writeDataToFile("0","jump.txt");
  writeDataToFile("-1","combatmode.txt");
  writeDataToFile("0","flee.txt");
  writeDataToFile("0","follow.txt");
  writeDataToFile("-1","behaviorstate.txt");
  writeDataToFile("0","forcefollow.txt");
  writeDataToFile("-1","is_in_combat.txt");
  writeDataToFile("-1","current_fleestate.txt");
  writeDataToFile("-1","current_combatmode.txt");
  writeDataToFile("-1","current_weapon.txt");
  writeDataToFile("0","actor_is_speaking.txt");
  writeDataToFile("0","dialogue.txt");
  writeDataToFile("0","nearbyhostiles.txt");
  writeDataToFile("0","heal.txt");
  writeDataToFile("0","inventoryopen.txt");
  writeDataToFile("0","outofammo.txt");
  writeDataToFile("0","weaponbroken.txt");
  writeDataToFile("-1","totalammo.txt");
  writeDataToFile("0","is_paused.txt");
  writeDataToFile("0","queststatus.txt");
  writeDataToFile("0","genericdialogue.txt");
  writeDataToFile("0","dialogueresponse.txt");
  writeDataToFile("-1","sitting.txt");
  writeDataToFile("-1","limb.txt");
  writeDataToFile("0","disable_writing.txt");
  writeDataToFile("0","isindialogue.txt");
}
//#endregion

// game state values
// -1 = game not open
// 0 = main menu
// 1 = in-game
// 2 = loading
let gamestate = -1;

/**
 * Write data to a file and ensure the required directories exist.
 * @param {string} data - The data to write to the file.
 * @param {string} filename - The filename to write to (default: fallout_data.txt).
 */
function writeDataToFile(data, filename = 'neuro_data.txt') {
    const filePath = neurovegaspath + `${filename}`; // Change path if necessary
    const dirPath = dirname(filePath);

    try {
        // Ensure the directory exists
        mkdirSync(dirPath, { recursive: true });

        // Write data to the file
        writeFileSync(filePath, data, 'utf-8');
        //console.log(`Data written to : ${filePath}`);
        return filePath;
    } catch (err) {
        console.error(`[NeuroVegas] Error writing to file : ${err.message}`);
    }
}

//#region File Paths
const damageFilePath = writeDataToFile("","hit.txt");
const healthFilePath = writeDataToFile("0","health.txt");
const locationFilePath = writeDataToFile("","location.txt");
const attackFilePath = writeDataToFile("0","attack.txt");
const playerattackFilePath = writeDataToFile("0","player_attack.txt");
const questFilePath = writeDataToFile("0","quest.txt");
const questobjectivesFilePath = writeDataToFile("0","questobjectives.txt");
const gamestateFilePath = writeDataToFile("-1","gamestate.txt");
const playerFilePath = writeDataToFile("NOT_CURRENTLY_DEFINED","player.txt");
const startupFilePath = writeDataToFile("0","startupcontext.txt");
const equipFilePath = writeDataToFile("0","weapon_to_equip.txt");
const validweaponFilePath = writeDataToFile("0","validweapons_name.txt");
const aidFilePath = writeDataToFile("0","aid_names.txt");
const validammoFilePath = writeDataToFile("0","ammo_names.txt");
const consumableFilePath = writeDataToFile("0","aid_to_use.txt");
const ammoFilePath = writeDataToFile("0","ammo_to_equip.txt");
const jumpFilePath = writeDataToFile("0","jump.txt");
const combatmodeFilePath = writeDataToFile("0","combatmode.txt");
const engagementFilePath = writeDataToFile("0","flee.txt");
const followFilePath = writeDataToFile("0","follow.txt");
const behaviorstateFilePath = writeDataToFile("-1","behaviorstate.txt");
const forcefollowFilePath = writeDataToFile("0","forcefollow.txt");
const combatstateFilePath = writeDataToFile("0","is_in_combat.txt");
const currentengagementFilePath = writeDataToFile("0","current_fleestate.txt");
const currentcombatmodeFilePath = writeDataToFile("-1","current_combatmode.txt");
const currentweaponFilePath = writeDataToFile("-1","current_weapon.txt");
const actorspeakingFilePath = writeDataToFile("0","actor_is_speaking.txt");
const dialogueFilePath = writeDataToFile("0","dialogue.txt");
const nearbyhostilesFilePath = writeDataToFile("0","nearbyhostiles.txt");
const unconsciousFilePath = writeDataToFile("0","is_unconscious.txt");
const revivedFilePath = writeDataToFile("0","revived.txt");
const healFilePath = writeDataToFile("0","heal.txt");
const inventoryopenFilePath = writeDataToFile("0","inventoryopen.txt");
const outofammoFilePath = writeDataToFile("0","outofammo.txt");
const weaponbrokenFilePath = writeDataToFile("0","weaponbroken.txt");
const totalammoFilePath = writeDataToFile("-1","totalammo.txt");
const pausedFilePath = writeDataToFile("0","is_paused.txt");
const queststatusFilePath = writeDataToFile("0","queststatus.txt");
const playerdeadFilePath = writeDataToFile("0","playerdead.txt");
const dialogueresponseFilePath = writeDataToFile("0","dialogueresponse.txt");
const sittingFilePath = writeDataToFile("-1","sitting.txt");
const limbFilePath = writeDataToFile("-1","limb.txt");
const disablewritingFilePath = writeDataToFile("0","disable_writing.txt");
const inventory_namesFilePath = writeDataToFile("0","inventory_names.txt");
const inventory_countFilePath = writeDataToFile("0","inventory_count.txt");
const limbcheckFilePath = writeDataToFile("1","limbcheck.txt");
const setquestdelayFilePath = writeDataToFile("0","setquestdelay.txt");
const genistalkingFilePath = writeDataToFile("0","genistalking.txt");
const genericdialogueFilePath = writeDataToFile("0","genericdialogue.txt");
const isindialogueFilePath = writeDataToFile("0","isindialogue.txt");
const levelFilePath = writeDataToFile("-1","level.txt");
const ignorelevelupFilePath = writeDataToFile("0","ignorelevelup.txt");
writeDataToFile("0","weaponforce.txt");
writeDataToFile("0","ammoforce.txt");
writeDataToFile("0","aidforce.txt");

console.log(`[NeuroVegas] Startup Data Initalized at : ${neurovegaspath}`);


//#region Actions

const jump = {
  name: 'jump',
  description: 'Performs a jump.',
  schema: {},
}

let equipweapon = {
    name: 'equip_weapon',
    description: 'Equips a weapon from your inventory to be used in combat.',
    schema: {
      type: 'object',
      properties: {
        weapon_select: { 
          type: 'string', 
          enum: []
        },
      },
      required: ['weapon_select'],
    },
}

const unequipweapon = {
  name: 'unequip_weapon',
  description: 'Unequips the weapon you currently have equipped, if no weapon is equipped you will use your bare fists in combat.',
  schema: {},
}

let useconsumable = {
  name: 'use_consumable',
  description: 'Uses a consumable aid item from your inventory.',
  schema: {
    type: 'object',
    properties: {
      consumable_select: { 
        type: 'string', 
        enum: []
       },
    },
    required: ['consumable_select'],
  },
}

let swapammo = {
  name: 'switch_ammo',
  description: 'Use this action to switch the ammunition your weapon is currently using.',
  schema: {
    type: 'object',
    properties: {
      ammo_select: { 
        type: 'string', 
        enum: []
      },
    },
    required: ['ammo_select'],
  },
}

const checkinventory = {
    name: 'check_inventory',
    description: 'Tells you all the items you currently have in your inventory.',
    schema: {},
}

const checkhealthstatus = {
  name: 'check_health_status',
  description: "Tells you the current status of your character's health.",
  schema: {},
}

const set_combat_mode_to_defensive = {
  name: 'set_combat_mode_to_defensive',
  description: "Switches your combat mode from Offensive to Defensive. When in Defensive mode, you will only initiate combat in self-defense.",
  schema: {},
}

const set_combat_mode_to_offensive = {
  name: 'set_combat_mode_to_offensive',
  description: "Switches your combat mode from Defensive to Offensive. When in Offensive mode, you will attack all hostiles on sight.",
  schema: {},
}


const fleefromcombat = {
  name: 'flee_from_combat',
  description: 'When in combat, allows you to flee from the enemy. Useful if you think you are outmatched.',
  schema: {},
}

const stopfleeing = {
  name: 'stop_fleeing',
  description: 'After fleeing from combat, allows you to stop fleeing and resume fighting.',
  schema: {},
}

const stopfollowing = {
  name: 'stop_following',
  description: 'Allows you to stop following the player and remain in place at your current position.',
  schema: {},
}

const resumefollowing = {
  name: 'resume_following',
  description: 'Allows you to resume following the player after you have stopped following.',
  schema: {},
}

const save_game = {
  name: 'save_game',
  description: 'Saves the game.',
  schema: {},
}
//#endregion


//#region Consumable Types
//list the type of each consumable item, theres probably a better way to do this but i wouldnt know
const consumableMap = {
  "Ant egg": "Food",
  "Ant meat": "Food",
  "Barrel cactus fruit": "Food",
  "Banana yucca fruit": "Food",
  "Bighorner meat": "Food",
  "Bighorner steak": "Food",
  "Black blood sausage": "Food",
  "BlamCo Mac & Cheese": "Food",
  "Bloatfly meat": "Food",
  "Bloatfly slider": "Food",
  "Blood sausage": "Food",
  "Brahmin meat": "Food",
  "Brahmin steak": "Food",
  "Brahmin Wellington": "Food",
  "Broc flower": "Food",
  "Bubble gum": "Food",
  "Buffalo gourd seed": "Food",
  "Caravan lunch": "Food",
  "Cave fungus": "Food",
  "Cazador egg": "Food",
  "Cook-Cook's fiend stew": "Food",
  "Coyote meat": "Food",
  "Coyote steak": "Food",
  "Cram": "Food",
  "Crispy squirrel bits": "Food",
  "Crunchy mutfruit": "Food",
  "Dandy Boy Apples": "Food",
  "Daturana": "Food",
  "Desert salad": "Food",
  "Dog meat": "Food",
  "Dog steak": "Food",
  "Fancy Lads Snack Cakes": "Food",
  "Fire ant egg": "Food",
  "Fire ant fricassée": "Food",
  "Fire ant meat": "Food",
  "Fresh apple": "Food",
  "Fresh carrot": "Food",
  "Fresh pear": "Food",
  "Fresh potato": "Food",
  "Gecko kebab": "Food",
  "Gecko meat": "Food",
  "Gecko steak": "Food",
  "Giant rat meat": "Food",
  "Grilled mantis": "Food",
  "Gum drops": "Food",
  "Honey mesquite pod": "Food",
  "Human flesh": "Food",
  "Human remains": "Food",
  "Iguana bits": "Food",
  "Iguana-on-a-stick": "Food",
  "Imitation strange meat pie": "Food",
  "InstaMash": "Food",
  "Irr. banana yucca": "Food",
  "Irr. barrel cactus": "Food",
  "Irr. Mac & Cheese": "Food",
  "Irradiated Cram": "Food",
  "Irr. crunchy mutfruit": "Food",
  "Irr. Dandy Boy Apples": "Food",
  "Irr. Fancy Lads": "Food",
  "Irr. gecko meat": "Food",
  "Irradiated InstaMash": "Food",
  "Irradiated mutfruit": "Food",
  "Irr. Pork n' Beans": "Food",
  "Irridiated potato": "Food",
  "Irr. Potato Crisps": "Food",
  "Irr. Salisbury Steak": "Food",
  "Irr. Sugar Bombs": "Food",
  "Irr. YumYum D. Eggs": "Food",
  "Jalapeño pepper": "Food",
  "Junk food": "Food",
  "Lakelurk egg": "Food",
  "Lakelurk meat": "Food",
  "Maize": "Food",
  "Mole rat meat": "Food",
  "Mole rat stew": "Food",
  "MRE": "Food",
  "Mushroom cloud": "Food",
  "Mutant cave fungus": "Food",
  "Mutfruit": "Food",
  "Nevada agave fruit": "Food",
  "Nightstalker tail": "Food",
  "Noodles": "Food",
  "Pinto bean pod": "Food",
  "Pinyon nut": "Food",
  "Pork n' Beans": "Food",
  "Potato Crisps": "Food",
  "Preserved meat": "Food",
  "Pre-War steak": "Food",
  "Prickly pear fruit": "Food",
  "Radroach meat": "Food",
  "Rat meat": "Food",
  "Ruby's casserole": "Food",
  "Sacred datura root": "Food",
  "Salient Green": "Food",
  "Salisbury Steak": "Food",
  "Spore carrier sap ": "Food",
  "Spore plant pods": "Food",
  "Squirrel on a stick": "Food",
  "Squirrel stew": "Food",
  "Strange meat": "Food",
  "Strange meat pie": "Food",
  "Sugar Bombs": "Food",
  "Thick red paste": "Food",
  "Thin red paste": "Food",
  "Trail mix": "Food",
  "Wasteland omelet": "Food",
  "White horsenettle": "Food",
  "Xander root": "Food",
  "Yao guai meat": "Food",
  "YumYum Deviled Eggs": "Food",
  "Absinthe": "Drink",
  "Atomic cocktail": "Alcohol",
  "Battle brew": "Alcohol",
  "Beer": "Alcohol",
  "Bitter drink": "Drink",
  "Black coffee": "Drink",
  "Blood pack": "Drink",
  "Dirty water": "Drink",
  "Dixon's whiskey": "Alcohol",
  "Ice cold Nuka-Cola": "Drink",
  "Irradiated beer": "Alcohol",
  "Irradiated scotch": "Alcohol",
  "Irradiated Sunset Sarsaparilla": "Drink",
  "Irradiated water": "Drink",
  "Irradiated whiskey": "Alcohol",
  "Jake Juice": "Alcohol",
  "Large wasteland tequila": "Alcohol",
  "Moonshine": "Alcohol",
  "Nightstalker squeezin's": "Drink",
  "Nuka-Cola": "Drink",
  "Nuka-Cola Quantum": "Drink",
  "Nuka-Cola Quartz": "Drink",
  "Nuka-Cola Victory": "Drink",
  "Purified water": "Drink",
  "Rum & Nuka": "Alcohol",
  "Scotch": "Alcohol",
  "Sierra Madre martini": "Alcohol",
  "Sunset Sarsaparilla": "Drink",
  "Vodka": "Alcohol",
  "Wasteland tequila": "Alcohol",
  "Whiskey": "Alcohol",
  "Wine": "Alcohol",
  "Ant queen pheromones": "Chem",
  "Antivenom": "Chem",
  "Ant nectar": "Chem",
  "Auto-inject stimpak": "Chem",
  "Auto-inject super stimpak": "Chem",
  "Blood Shield": "Chem",
  "Buffout": "Chem",
  "Cateye": "Chem",
  "Coyote tobacco chew": "Chem",
  "Datura antivenom": "Chem",
  "Datura hide": "Chem",
  "Dixon's Jet": "Chem",
  "Doctor's bag": "Chem",
  "Fiery purgative": "Chem",
  "Fire ant nectar": "Chem",
  "Fixer": "Chem",
  "Ghost sight": "Chem",
  "Healing poultice": "Chem",
  "Healing powder": "Chem",
  "Hydra": "Chem",
  "Jet": "Chem",
  "Med-X": "Chem",
  "Medical supplies": "Chem",
  "Mentats": "Chem",
  "Party Time Mentats": "Chem",
  "Psycho": "Chem",
  "Rad-X": "Chem",
  "RadAway": "Chem",
  "Rebound": "Chem",
  "Rocket": "Chem",
  "Rushing water": "Chem",
  "Slasher": "Chem",
  "Steady": "Chem",
  "Stimpak": "Chem",
  "Super stimpak": "Chem",
  "Turbo": "Chem",
  "Ultrajet": "Chem",
  "Weapon binding ritual": "Chem",
  "Bleak venom": "Poison",
  "CLoud Kiss": "Poison",
  "Dark datura": "Poison",
  "Mother Darkness": "Poison",
  "Silver Sting": "Poison",
  "Tremble": "Poison",
}
//#endregion

/*
	
*/
//game initialization
const iniContent = readFileSync(iniPath, 'utf-8'); // Read the file as a string
const parsedini = ini.parse(iniContent); // Parse the ini file

const NEURO_SERVER_URL = String(parsedini.Config.Websocket_URL)
const GAME_NAME = 'Fallout: New Vegas'

const neuroClient = new NeuroClient(NEURO_SERVER_URL, GAME_NAME, () => {
    //neuroClient.registerActions([save_game])
})





setInterval(() => {
    update();
}, frameDuration);

function update() {
  checkGameRunning();
if (isRunning == true) {
    //game state values
    //-1 = game not open
    //0 = main menu
    //1 = in-game
    //2 = loading
    //#region Startup Context
    //update game state
    readFile(gamestateFilePath, 'utf-8', (err, gamestatedata) => {
      if (err) {
          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
          return;
      }

      if (Number(gamestatedata) !== gamestate && gamestatedata !== "" && gamestatedata !== "-1") {


          gamestate = Number(gamestatedata);
          //update player name
          readFile(playerFilePath, 'utf-8', (err, playerdata) => {
            if (err) {
                console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                return;
            }

            if (playerdata !== playername && playerdata !== "") {
                playername = playerdata;
            }
            
              //update location
              readFile(locationFilePath, 'utf-8', (err, locationdata) => {
                if (err) {
                    console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                    return;
                }


                if (locationdata !== ""){
                  locationdata = parseMultiLineString(locationdata);
                  if (locationdata.length > 2) {
                    if (locationdata[0] !== currentlocation) {
        
                        currentlocation = locationdata[0];
        
                        let daytime = "AM";
                        let decimaltime = Number(locationdata[2]);
                        let hour = Math.floor(decimaltime);
                        let minute = Math.round((decimaltime - hour) * 60);
        
                        if (hour > 12) {
                          hour = hour - 12;
                          daytime = "PM";
                        } else if (hour == 12) {
                          daytime = "PM";
                        } else if (hour < 12){
                          daytime = "AM";
                        }
                        
                        let time = "";

                        if (minute < 10) {
                            time = `${hour}:0${minute} ${daytime}`;
                        } else {
                          if (hour == 0) {
                            time = `12:${minute} ${daytime}`;
                          } else {
                            time = `${hour}:${minute} ${daytime}`;
                          }
                        }
        
                        currenttime = time;

                        indoors = Number(locationdata[1]);
                    }
                  }
                }

                      
                        //update health
                        readFile(healthFilePath, 'utf-8', (err, healthdata) => {
                          if (err) {
                              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                              return;
                          }
                          healthdata = parseMultiLineString(healthdata);
                          if ((healthdata[0] !== String(currenthealth) || healthdata[1] !== String(maxhealth))&& healthdata[0] !== "") {

                              currenthealth = Number(healthdata[0]);
                              maxhealth = Number(healthdata[1]);
                          }

                            //update current equipped weapon
                            readFile(currentweaponFilePath, 'utf-8', (err, weapondata) => {
                              if (err) {
                                  console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                                  return;
                              }
                              readFile(neurovegaspath + "current_combatmode.txt", 'utf-8', (err, combatmodedata) => {

                              if (weapondata !== current_equipped_weapon && weapondata !== "") {
                                  current_equipped_weapon = weapondata;
                              }

                              readFile(levelFilePath, 'utf-8', (err, leveldata) => {

                              if (leveldata != "") {
                                leveldata = Number(leveldata);
                                if (leveldata != -1) {
                                  if (leveldata != currentlevel) {
                                    currentlevel = leveldata;
                                  }
                                }
                              }

                              let levelstring = `Current level: ${currentlevel} \n`;

                              let locationstring = "";

                              if (indoors == 0) {
                                locationstring = `Current location: ${currentlocation} (Outdoors) \nCurrent time: ${currenttime} \n`;
                              } else if (indoors == 1) {
                                locationstring = `Current location: ${currentlocation} (Indoors) \nCurrent time: ${currenttime} \n`;
                              }
                                

                              let healthstring = `Current health: ${currenthealth}/${maxhealth} \n`;

                              let weaponstring = "";

                              

                              if (current_equipped_weapon != "-1") {
                                if (current_equipped_weapon != "0") {
                                    weaponstring = `Current equipped weapon: ${current_equipped_weapon} \n`;
                                } else {
                                  weaponstring = `No weapon is equipped \n`;
                                }
                              }

                              let combat_mode_string = "";

                              if (combatmodedata == "0") {
                                combat_mode_string = `Combat mode is currently set to Offensive (Enemies will be attacked on sight)`;
                              } else if (combatmodedata == "1") {
                                combat_mode_string = `Combat mode is currently set to Defensive (Enemies will only be attacked in self-defense)`;
                              }

                              let startupstring = `The game has started! You are currently playing as ${playername}'s companion, accompanying them on their journey across the Mojave Wasteland. You may use any available actions to control your character. \n` + locationstring + levelstring + healthstring + weaponstring + combat_mode_string;

                              if (gamestate == 0) {
                                writeDataToFile("1","limbcheck.txt");
                                neuroClient.sendContext("You are currently on the main menu, please wait for the game to start.",true);
                                neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'set_combat_mode_to_defensive', 'set_combat_mode_to_offensive', 'save_game','check_health_status','check_inventory']);
                                ResetData();
                                equippable_weapons = "";
                                equippable_aid = "";
                                equippable_ammo = "";
                              } else if (gamestate == 1) {
                                neuroClient.registerActions([save_game,checkhealthstatus,checkinventory,jump]);
                                startupcontextsent = 1;                    
  
                                  neuroClient.sendContext(startupstring,true);

                                writeDataToFile("1","limbcheck.txt");
                                ResetData();
                                equippable_weapons = "";
                                equippable_aid = "";
                                equippable_ammo = "";
                              }
                            });
                            });
                            });  

                        });

                    });

                  });

      }
    
    //#endregion

    if (startupcontextsent == 1) {
      if (gamestate == 1) {
        //#region Player name
        //update player name
        readFile(playerFilePath, 'utf-8', (err, playerdata) => {
          if (err) {
              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
              return;
          }

          if (playerdata !== playername && playerdata !== "") {
              console.log(`[NeuroVegas] Player name registered: ${playerdata}`);

              playername = playerdata;
          }
        });
        //#endregion

        //#region Player Death Context
        //update player name
        readFile(playerdeadFilePath, 'utf-8', (err, playerdeaddata) => {
          if (err) {
              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
              return;
          }

          if (playerdeaddata !== "") {
            playerdeaddata = parseMultiLineString(playerdeaddata);
            if (playerdeaddata.length > 1) {
                if (Number(playerdeaddata[0] == 1) && playerdead == 0) {
                  playerdead = 1;
                  neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'set_combat_mode_to_defensive', 'set_combat_mode_to_offensive', 'save_game','check_health_status','check_inventory']);
                  ResetData();
                  if (playerdeaddata[1] == "0") { 
                    neuroClient.sendContext(`${playername} has died! Please wait for a previous save file to be loaded.`);
                  } else {
                    if (playerdeaddata[1] == "Neuro-Sama" || playerdeaddata[1] == "Evil Neuro") { 
                      neuroClient.sendContext(`Oops! You accidentally killed ${playername}! Please wait for a previous save file to be loaded.`);
                    } else {
                      neuroClient.sendContext(`${playername} was killed by ${playerdeaddata[1]}! Please wait for a previous save file to be loaded.`);
                    }
                  }
                } else if (Number(playerdeaddata[0] == 0) && playerdead == 1) {
                  playerdead = 0;
                  console.log(`[NeuroVegas] Player is now alive!`);
                  readFile(playerFilePath, 'utf-8', (err, playerdata) => {
                    if (err) {
                        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                        return;
                    }
        
                    if (playerdata !== playername && playerdata !== "") {
                        playername = playerdata;
                    }
                    
                //update location
                readFile(locationFilePath, 'utf-8', (err, locationdata) => {
                  if (err) {
                      console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                      return;
                  }

                  if (locationdata !== ""){
                    locationdata = parseMultiLineString(locationdata);
                    if (locationdata.length > 2) {
                      if (locationdata[0] !== currentlocation) {
                          currentlocation = locationdata[0];
          
                          let daytime = "AM";
                          let decimaltime = Number(locationdata[2]);
                          let hour = Math.floor(decimaltime);
                          let minute = Math.round((decimaltime - hour) * 60);
          
                          if (hour > 12) {
                            hour = hour - 12;
                            daytime = "PM";
                          } else if (hour == 12) {
                            daytime = "PM";
                          } else if (hour < 12){
                            daytime = "AM";
                          }
                          
                          let time = "";

                          if (minute < 10) {
                            time = `${hour}:0${minute} ${daytime}`;
                        } else {
                          if (hour == 0) {
                            time = `12:${minute} ${daytime}`;
                          } else {
                            time = `${hour}:${minute} ${daytime}`;
                          }
                        }
          
                          currenttime = time;

                          indoors = Number(locationdata[1]);
                      }
                    }
                  }
        
                                //update health
                                readFile(healthFilePath, 'utf-8', (err, healthdata) => {
                                  if (err) {
                                      console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                                      return;
                                  }
                                  healthdata = parseMultiLineString(healthdata);
                                  if ((healthdata[0] !== String(currenthealth) || healthdata[1] !== String(maxhealth))&& healthdata[0] !== "") {
        
                                      currenthealth = Number(healthdata[0]);
                                      maxhealth = Number(healthdata[1]);
                                  }
        
                                    //update current equipped weapon
                                    readFile(currentweaponFilePath, 'utf-8', (err, weapondata) => {
                                      if (err) {
                                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                                          return;
                                      }
        
                                      readFile(neurovegaspath + "current_combatmode.txt", 'utf-8', (err, combatmodedata) => {

                                      if (weapondata !== current_equipped_weapon && weapondata !== "" && weapondata !== "-1") {
                                          current_equipped_weapon = weapondata;
                                      }
        
                                      readFile(levelFilePath, 'utf-8', (err, leveldata) => {

                                        if (leveldata != "") {
                                          leveldata = Number(leveldata);
                                          if (leveldata != -1) {
                                            if (leveldata != currentlevel) {
                                              currentlevel = leveldata;
                                            }
                                          }
                                        }
          
                                      let levelstring = `Current level: ${currentlevel} \n`;
        
                                      let locationstring = "";

                                      if (indoors == 0) {
                                        locationstring = `Current location: ${currentlocation} (Outdoors) \nCurrent time: ${currenttime} \n`;
                                      } else if (indoors == 1) {
                                        locationstring = `Current location: ${currentlocation} (Indoors) \nCurrent time: ${currenttime} \n`;
                                      }

                                      let healthstring = `Current health: ${currenthealth}/${maxhealth} \n`;
        
                                      let weaponstring = "";
        
                                      if (current_equipped_weapon != "-1") {
                                        if (current_equipped_weapon != "0") {
                                            weaponstring = `Current equipped weapon: ${current_equipped_weapon} \n`;
                                        } else {
                                          weaponstring = `No weapon is equipped \n`;
                                        }
                                      }

                                      let combat_mode_string = "";

                                      if (combatmodedata == "0") {
                                        combat_mode_string = `Combat mode is currently set to Offensive (Enemies will be attacked on sight)`;
                                      } else if (combatmodedata == "1") {
                                        combat_mode_string = `Combat mode is currently set to Defensive (Enemies will only be attacked in self-defense)`;
                                      }
        
                                      let startupstring = `A previous save has been loaded! \n` + locationstring + levelstring + healthstring + weaponstring + combat_mode_string;
      
                                        neuroClient.sendContext(startupstring,true);
                                      currentquest = "0";
                                      questobjs = "0";
                                      ResetData();
                                      equippable_weapons = "";
                                      equippable_aid = "";
                                      equippable_ammo = "";
                                      currentquest = "";
                                      is_in_combat = 0;
                                      writeDataToFile("1","limbcheck.txt");
                                      neuroClient.registerActions([save_game,checkhealthstatus,checkinventory,jump]);
                                    });
                                    });
                                    });  
        
                                });
        
                            });
        
                          });
        
                }
              }
          }
        });
        //#endregion

        //#region Dialogue Context
        //send dialogue context
        readFile(actorspeakingFilePath, 'utf-8', (err, speakingdata) => {
          if (err) {
              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
              return;
          }
          readFile(dialogueFilePath, 'utf-8', (err, dialoguedata) => {
            if (err) {
                console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                return;
            }
            if (Number(speakingdata) !== actor_is_speaking && speakingdata !== "") {
              actor_is_speaking = Number(speakingdata);
            }

            if (dialoguedata !== dialogue && dialoguedata !== "") {
              dialogue = dialoguedata;
              dialoguedata = parseMultiLineString(dialoguedata);
              if (dialoguedata.length > 1 && actor_is_speaking == 1) {
                if (dialogue_add != dialoguedata[0]) {
                  dialogue_add = dialoguedata[0];
                  dialogue_string += dialogue_add + " ";
                }

                dialoguespeaker = dialoguedata[1];
            }

            }
            readFile(dialogueresponseFilePath, 'utf-8', (err, responsedata) => {
              if (err) {
                  console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                  return;
              }

              if (responsedata !== dialogueresponse && responsedata !== "" && responsedata !== "0") {
                dialogueresponse = responsedata;
              }


              if (dialoguedata.length > 1) {
                if (actor_is_speaking == 0 && dialogue_string != "") {
                  // Replace &PCName with playername
                  dialogue_string = dialogue_string.replace(/&PCName/g, playername);

                  if (dialogueresponse != "" && dialogueresponse != "0" && dialogueresponse != "null") {
                    neuroClient.sendContext(playername+ ": " + dialogueresponse + "\n"+ dialoguespeaker + ": " + dialogue_string);
                    writeDataToFile("0","dialogueresponse.txt");
                    dialogue_string = "";
                  } else {
                    neuroClient.sendContext(dialoguespeaker + ": " + dialogue_string);
                    writeDataToFile("0","dialogueresponse.txt");
                    dialogue_string = "";
                  }
                  dialoguespeaker = "";
                  dialogue_add = "";
                }
              }
            });
          });
        });   
        //#endregion



        //#region Location context
        //update location
        readFile(locationFilePath, 'utf-8', (err, locationdata) => {
          if (err) {
              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
              return;
          }
          if (locationdata !== ""){
            locationdata = parseMultiLineString(locationdata);
            if (locationdata.length > 2) {
              if (locationdata[0] !== currentlocation) {
                  currentlocation = locationdata[0];

                  let daytime = "AM";
                  let decimaltime = Number(locationdata[2]);
                  let hour = Math.floor(decimaltime);
                  let minute = Math.round((decimaltime - hour) * 60);

                  if (hour > 12) {
                    hour = hour - 12;
                    daytime = "PM";
                  } else if (hour == 12) {
                    daytime = "PM";
                  } else if (hour < 12){
                    daytime = "AM";
                  }

                  let time = "";

                        if (minute < 10) {
                            time = `${hour}:0${minute} ${daytime}`;
                        } else {
                          if (hour == 0) {
                            time = `12:${minute} ${daytime}`;
                          } else {
                            time = `${hour}:${minute} ${daytime}`;
                          }
                        }


                  currenttime = time;

                  indoors = Number(locationdata[1]);
                  if (currentlocation != "Endgame" && currentlocation != "Dead Money Narration" && currentlocation != "Old World Blue Narration" && currentlocation != "Slide Show Theatre Room") {
                    if (indoors == 0) {
                      neuroClient.sendContext(`Current location is now: ${currentlocation} (Outdoors)\nCurrent time is: ${time}`,true);
                    } else if (indoors == 1) {
                      neuroClient.sendContext(`Current location is now: ${currentlocation} (Indoors)\nCurrent time is: ${time}`,true);
                    }
                  }
              }
            }
          }
        });
        //#endregion


      }
      //#region Limb Health
      readFile(limbFilePath, 'utf-8', (err, limbdata) => {
        if (err) {
          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
          return;
        }
        if (limbdata !== "" && limbdata !== "-1"){
          limbdata = parseMultiLineString(limbdata);
          if (limbdata.length > 5) {
            headhealth = Number(limbdata[0]);
            torsohealth = Number(limbdata[1]);
            leftarmhealth = Number(limbdata[2]);
            rightarmhealth = Number(limbdata[3]);
            leftleghealth = Number(limbdata[4]);
            rightleghealth = Number(limbdata[5]);
          }
        }
      });

      //#endregion

      //#region Health Context
      //update health
      readFile(healthFilePath, 'utf-8', (err, healthdata) => {
        if (err) {
            console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
            return;
        }

        readFile(unconsciousFilePath, 'utf-8', (err, unconsciousdata) => {
          if (err) {
              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
              return;
          }
          readFile(revivedFilePath, 'utf-8', (err, revivedata) => {
            if (err) {
                console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                return;
            }
            readFile(healFilePath, 'utf-8', (err, healdata) => {
              if (err) {
                  console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                  return;
              }
    
              healthdata = parseMultiLineString(healthdata);
              if (healthdata.length > 1) {
                if ((healthdata[0] !== String(currenthealth) || healthdata[1] !== String(maxhealth))) {
                    currenthealth = Number(healthdata[0]);
                    maxhealth = Number(healthdata[1]);

                    if (is_unconscious == 0 && revivedata == "0") {
                      //send a damage warning when neuro's health is below 40%
                      if (currenthealth/maxhealth < 0.40) {
                        if (half_dmgwarning == 0) {
                          neuroClient.sendContext(`Damage Warning!\n Health is at: ${currenthealth}/${maxhealth}`);
                          half_dmgwarning = 1;
                        }
                      //reset damage warning once neuro has recovered health
                      } else if ( currenthealth/maxhealth > 0.40 && half_dmgwarning == 1) {
                        half_dmgwarning = 0;
                      }
                    }
                }
              }




              unconsciousdata = parseMultiLineString(unconsciousdata);

              if (unconsciousdata.length > 1) {
                if (revivedata == "0") {
                    if (Number(unconsciousdata[0]) == 1 && is_unconscious == 0) {
                      if (unconsciousdata[1] == playername) {
                        neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}! (Friendly Fire)\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                      } else {
                        if (unconsciousdata[1] != "") {
                          neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                        } else {
                          neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                        }
                      }
                      is_unconscious = 1;
                      disable_writing = 1;
                      equippable_weapons = "";
                      equippable_aid = "";
                      equippable_ammo = "";
                      ResetData();
                      neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'set_combat_mode_to_defensive', 'set_combat_mode_to_offensive', 'check_inventory', 'save_game','check_health_status']);
                    }else if (Number(unconsciousdata[0]) == 0 && is_unconscious == 1) {
                      setTimeout(() => {    
                        neuroClient.sendContext(`You've recovered consciousness!\nHealth is at: ${currenthealth}/${maxhealth}`);
                      }, 250);
                      neuroClient.registerActions([save_game,checkhealthstatus,checkinventory,jump]);
                      ResetData();
                      disable_writing = 0;
                      is_unconscious = 0;
                    }
                } else if (revivedata == "1") {
                  if (Number(unconsciousdata[0]) == 1 && is_unconscious == 0) {
                    if (unconsciousdata[1] == playername) {
                      neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}! (Friendly Fire)\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                    } else {
                      if (unconsciousdata[1] != "") {
                        neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                      } else {
                        neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                      }
                    }
                    is_unconscious = 1;
                    equippable_weapons = "";
                    equippable_aid = "";
                    equippable_ammo = "";
                    disable_writing = 1;
                    ResetData();
                  }else if (Number(unconsciousdata[0]) == 0 && is_unconscious == 1 && currenthealth != 0) {
                      setTimeout(() => {    
                        neuroClient.sendContext(`${playername} has revived you!\nHealth is at: ${currenthealth}/${maxhealth}`);
                      }, 250);
                      writeDataToFile("0","revived.txt");
                      neuroClient.registerActions([save_game,checkhealthstatus,checkinventory,jump]);
                      ResetData();
                      disable_writing = 0;
                      is_unconscious = 0;
                  }
                }
              }

              healdata = parseMultiLineString(healdata);
              if (healdata.length > 1 && is_unconscious == 0) {
                if (healdata[0] == "1") {
                  if (headhealth != 0 && torsohealth != 0 && leftarmhealth != 0 && rightarmhealth != 0 && leftleghealth != 0 && rightleghealth != 0) {
                    neuroClient.sendContext(`${playername} healed your for ${healdata[1]} hit points!\nHealth is now at: ${currenthealth}/${maxhealth}`);
                  } else {
                    neuroClient.sendContext(`${playername} healed your for ${healdata[1]} hit points!\nHealth is now at: ${currenthealth}/${maxhealth}\nAll limbs have been healed!`);
                  }
                  writeDataToFile("0","heal.txt");
                }
              }
        //#region Level up Context
        readFile(ignorelevelupFilePath, 'utf-8', (err, ignorelevelupdata) => {
          readFile(levelFilePath, 'utf-8', (err, levelupdata) => {
            if (ignorelevelupdata != "") {
              if (ignorelevelupdata == "0") {
                if (levelupdata != "") {
                  levelupdata = Number(levelupdata);
                  if (levelupdata != -1) {
                    if (levelupdata > currentlevel) {
                      currentlevel = levelupdata;
                      neuroClient.sendContext(`You and ${playername} have leveled up to level ${currentlevel}!`);
                    }
                  }
                }
              }
            } else {
              if (levelupdata != "") {
                levelupdata = Number(levelupdata);
                currentlevel = levelupdata;
              }
            }

          });
        });
        //#endregion


    //#region Item Usage
    if (is_unconscious == 0 && playerdead == 0) {
      readFile(currentweaponFilePath, 'utf-8', (err, weapondata) => {
        if (err) {
            console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
            return;
        }
          readFile(neurovegaspath + "validweapons_name.txt", 'utf-8', (err, equipdata) => {
          if (err) {
              console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
              return;
          }      
            readFile(neurovegaspath + "aid_names.txt", 'utf-8', (err, aiddata) => {
            if (err) {
                console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                return;
            }
              readFile(neurovegaspath + "ammo_names.txt", 'utf-8', (err, ammodata) => {
              if (err) {
                  console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                  return;
              }
              readFile(inventoryopenFilePath, 'utf-8', (err, inventoryopendata) => {
                if (err) {
                    console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                    return;
                }
                //register following actions depending neuro's current behavior state
                readFile(behaviorstateFilePath, 'utf-8', (err, followdata) => {
                if (err) {
                    console.error(`[NeuroVegas] Error reading file: ${err.message}`);
                    return;
                }
                readFile(forcefollowFilePath, 'utf-8', (err, forcefollowdata) => {
                  if (err) {
                      console.error(`[NeuroVegas] Error reading file: ${err.message}`);
                      return;
                  }

                //update inventory state
                if (Number(inventoryopendata) !== inventoryopen && inventoryopendata !== "") {
                  inventoryopen = Number(inventoryopendata);
                  if (inventoryopen == 1) {
                    //neuroClient.unregisterActions(['unequip_weapon','equip_weapon','use_consumable','switch_ammo','stop_following','resume_following','jump']);
                    //neuroClient.sendContext(`${playername} has opened your interaction menu, certain actions will be temporarily disabled.`,true);
                    //writeDataToFile("0","validweapons_name.txt");
                    //writeDataToFile("0","aid_names.txt");
                    //writeDataToFile("0","ammo_names.txt");
                    //writeDataToFile("-1","current_weapon.txt");
                    //writeDataToFile("-1","behaviorstate.txt");
                  } else if (inventoryopen == 0) {
                    //neuroClient.sendContext(`${playername} has closed your interaction menu.`,true);
                    //writeDataToFile("0","validweapons_name.txt");
                    //writeDataToFile("0","aid_names.txt");
                    //writeDataToFile("0","ammo_names.txt");
                    //writeDataToFile("-1","current_weapon.txt");
                    //writeDataToFile("-1","behaviorstate.txt");   
                  }
                }

                if (inventoryopen == 1) {
                  //writeDataToFile("0","validweapons_name.txt");
                  //writeDataToFile("0","aid_names.txt");
                  //writeDataToFile("0","ammo_names.txt");
                  //writeDataToFile("-1","current_weapon.txt");
                  //writeDataToFile("-1","behaviorstate.txt");                    
                }



                  //register use consumable action if neuro has a consumable to use
                  if (aiddata !== equippable_aid && aiddata !== "") {
                    console.log(`[NeuroVegas] Consumable items updated : ${aiddata}`);
        
                    equippable_aid = aiddata;
                
                    if (equippable_aid != "0") {
                      //if (inventoryopen == 0) { 
                        neuroClient.unregisterActions(['use_consumable']);
                        //parse the current valid selection of consumables into a string array of all the consumable names
                        equipaiddata = equippable_aid
                        equipaiddata = equipaiddata.replace(/\$/g, "");
                        consumables = parseMultiLineString(equipaiddata);
                          
                        console.log(consumables);
                      
                        //initialize the choose consumable action with our valid consumable names
                        useconsumable = {
                          name: 'use_consumable',
                          description: 'Uses a consumable aid item from your inventory.',
                          schema: {
                            type: 'object',
                            properties: {
                              consumable_select: { 
                                type: 'string', 
                                enum: consumables
                              },
                            },
                            required: ['consumable_select'],
                          },
                        }
                        
                        //build the string of valid consumables to send to neuro
                        neuroClient.registerActions([useconsumable]);
                      //}
                    } else {
                        neuroClient.unregisterActions(['use_consumable']);
                    }
                  }

                  //register equip weapon action if neuro has a weapon to equip
                  if (equipdata !== equippable_weapons && equipdata !== "") {
                    console.log(`[NeuroVegas] Equippable weapons updated : ${equipdata}`);
        
                    equippable_weapons = equipdata;
                    
                    if (equippable_weapons != "0") {
                      //if (inventoryopen == 0) {
                        neuroClient.unregisterActions(['equip_weapon']);
                        //parse the current valid selection of weapons into a string array of all the weapon names
                        wepdata = equippable_weapons
                        wepdata = wepdata.replace(/\$/g, "");
                        validweapons = parseMultiLineString(wepdata);
                          
                        console.log(validweapons);
                        
                        //initialize the choose weapon action with our valid weapon names
                        equipweapon = {
                          name: 'equip_weapon',
                          description: 'Equips a weapon from your inventory to be used in combat.',
                          schema: {
                            type: 'object',
                            properties: {
                              weapon_select: { 
                                type: 'string', 
                                enum: validweapons
                              },
                            },
                            required: ['weapon_select'],
                          },
                        }
                    
                        //build the string of valid weapons to send to neuro
                        neuroClient.registerActions([equipweapon]);
                      //}
                    } else {
                        neuroClient.unregisterActions(['equip_weapon']);
                    }
                  }

                  //register switch ammo action if neuro has an alternative ammo to switch to
                  if (ammodata !== equippable_ammo && ammodata !== "") {
                    console.log(`[NeuroVegas] Alternate ammo types updated : ${ammodata}`);     
                
                    equippable_ammo = ammodata;
                
                    if (equippable_ammo != "0") {
                      //if (inventoryopen == 0) {
                        neuroClient.unregisterActions(['switch_ammo']);
                        equipammodata = equippable_ammo;
                        equipammodata = equipammodata.replace(/\$/g, "");
                        ammos = parseMultiLineString(equipammodata);
                  
                        //initialize the choose weapon action with our valid ammo names
                        swapammo = {
                          name: 'switch_ammo',
                          description: 'Use this action to switch the ammunition your weapon is currently using.',
                          schema: {
                            type: 'object',
                            properties: {
                              ammo_select: { 
                                type: 'string', 
                                enum: ammos
                              },
                            },
                            required: ['ammo_select'],
                          },
                        }
                      
                        //send the ammo selection action force along with the result for this action
                        neuroClient.registerActions([swapammo]);
                      //}
                    } else {
                        neuroClient.unregisterActions(['switch_ammo']);
                    }
                  }

                  //send out of ammo context
                  readFile(outofammoFilePath, 'utf-8', (err, outofammodata) => {
                    if (err) {
                        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                        return;
                    }
                    readFile(weaponbrokenFilePath, 'utf-8', (err, weaponbrokendata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }
                      // Scrapped feature where the same thing that happens when she runs out of ammo would happen when her weapon breaks but it didnt exactly work the same way so i scrapped it
                      // I just made it so that neuro's weapon can never break, it forever remains at the same health it was when she first equipped it
                      /*
                      if (weaponbrokendata != "" && Number(weaponbrokendata) == 1 && Number(weaponbrokendata) != 0){
                        if (equippable_weapons != "0") {
                          if (weapon_action_force == 0) {
                            const available_weps = equippable_weapons.replace(/\$/g, "");
                            const available_weps_array = parseMultiLineString(available_weps);
                            const weapons_string = available_weps_array.join(', ');
                            neuroClient.forceActions(`${current_equipped_weapon} has been broken! Please choose another weapon from your inventory to equip.`,['equip_weapon'],'Available Weapons: ' + weapons_string,false);
                            weapon_action_force = 1;
                            writeDataToFile("1","weaponforce.txt");
                          }
                        } else {
                          neuroClient.sendContext(`${current_equipped_weapon} has been broken and was unequipped!`);
                        }
                          
                        writeDataToFile("0","weaponbroke.txt");
                      }*/

                      if (outofammodata != "" && Number(outofammodata) == 1 && Number(outofammodata) != 0){
                          if (equippable_weapons != "0") {
                            if (weapon_action_force == 0) {
                              const available_weps = equippable_weapons.replace(/\$/g, "");
                              const available_weps_array = parseMultiLineString(available_weps);
                              const weapons_string = available_weps_array.join(', ');
                              neuroClient.forceActions(`${current_equipped_weapon} is out of ammo! Please choose another weapon from your inventory to equip.`,['equip_weapon'],'Available Weapons: ' + weapons_string,false);
                              weapon_action_force = 1;
                              writeDataToFile("1","weaponforce.txt");
                            }
                          } else {
                            neuroClient.sendContext(`${current_equipped_weapon} is out of ammo and has been unequipped!`);
                          }
                            
                          writeDataToFile("0","outofammo.txt");
                      }
                    });
                  });
    
                  //update current equipped weapon
                  if (weapondata !== current_equipped_weapon && weapondata !== "") {
                    current_equipped_weapon = weapondata;
                    if (current_equipped_weapon == "0") {
                      neuroClient.unregisterActions(['unequip_weapon']);
                      current_weapon = "Bare fists";
                    } else if (current_equipped_weapon != "-1"){
                      //if (inventoryopen == 0) {
                        neuroClient.registerActions([unequipweapon]);
                        current_weapon = current_equipped_weapon;
                    // } else {
                      //  console.log("[NeuroVegas] inventory is open, not registering unequip weapon action");
                      //}
                    }
                  }    
                  //#endregion
                  //#region Behavior State/Sitting
                  readFile(sittingFilePath, 'utf-8', (err, sittingdata) => {
                    if (err) {
                        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                        return;
                    }
                      if (sittingdata !== "") {
                        if (Number(sittingdata) == 1 && is_sitting == 0) {
                          is_sitting = 1;
                          neuroClient.unregisterActions(['stop_following','resume_following','jump']);
                          neuroClient.sendContext(`You and ${playername} have found a nice place to sit down.`);
                        } else if (Number(sittingdata) == 0 && is_sitting == 1) {
                          is_sitting = 0;
                          neuroClient.sendContext(`You and ${playername} have gotten up from your seats.`);
                          neuroClient.registerActions([jump]);
                        }
                      }
                      if (followdata !== behaviorstate && followdata !== "") {
                        behaviorstate = followdata;
                  
                          forcefollow = forcefollowdata;
                          if (is_sitting == 0) {
                            if (behaviorstate == "0") {
                                neuroClient.unregisterActions(['stop_following','resume_following']);
                                neuroClient.registerActions([stopfollowing]);
                                if (forcefollow == "1") {
                                  neuroClient.sendContext(`${playername} has forced you to resume following.`);
                                  writeDataToFile(String(0),"forcefollow.txt");
                                }
                            } else if (behaviorstate == "1") {
                                neuroClient.unregisterActions(['stop_following','resume_following']);
                                neuroClient.registerActions([resumefollowing]);

                              if (forcefollow == "1") {
                                  neuroClient.sendContext(`${playername} has forced you to stay put and stop following for now.`);
                                  writeDataToFile(String(0),"forcefollow.txt");
                              }
                            } else if (behaviorstate == "2") {
                                neuroClient.unregisterActions(['stop_following','resume_following']);
                            } 
                          }
                      }

                //#region Quest Context
  //update quest objectives
  readFile(questobjectivesFilePath, 'utf-8', (err, questobjdata) => {
    if (err) {
      console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
      return;
    }
    //update active quest
    readFile(questFilePath, 'utf-8', (err, questdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      //update active quest
      readFile(queststatusFilePath, 'utf-8', (err, queststatusdata) => {
        if (err) {
          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
          return;
        }

        //quest successfully completed
        if (queststatusdata == "1") {
          neuroClient.sendContext(`QUEST COMPLETED: ${currentquest}`);
          currentquest = "0";
          questobjs = "0";
          writeDataToFile("0", "queststatus.txt");
          //quest failed 
        } else if (queststatusdata == "2") {
          neuroClient.sendContext(`QUEST FAILED: ${currentquest}`);
          currentquest = "0";
          questobjs = "0";
          writeDataToFile("0", "queststatus.txt");
        }

        questobjdata = questobjdata.replace(/\$/g, "");

        if (questobjdata !== questobjs && questobjdata !== "") {

          questobjs = questobjdata;

          if (questdata !== "") {
            currentquest = questdata;

            if (currentquest !== "0") {
              if (questobjs !== "0") {
                questobjectives = parseMultiLineString(questobjs);

                // Check if the current quest is "They Went That-a-Way"
                if (currentquest === "They Went That-a-Way" || currentquest === "Ring-a-Ding-Ding!") {
                  questobjectives = questobjectives.map(obj => obj.replace(/\byou\b/gi, playername).replace(/\byour\b/gi, `${playername}'s`));
                }

                let optionalObjectives = questobjectives.filter(obj => obj.includes("(Optional)")).map(obj => obj.replace("(Optional)", "").trim());
                let mainObjectives = questobjectives.filter(obj => !obj.includes("(Optional)"));
        
                let contextString = `Quest Updated!\nCurrent Quest: ${currentquest}\nQuest Objectives: ${mainObjectives.join(' ')}`;
                if (optionalObjectives.length > 0) {
                    contextString += `\nOptional Objectives: ${optionalObjectives.join(' ')}`;
                }
        
                neuroClient.sendContext(contextString, true);
              } else {
                neuroClient.sendContext(`Quest Updated!\nCurrent Quest: ${currentquest}\nQuest Objectives: No current objectives.`,true);
                questobjectives = [];
              }
            } else {
              if (playerdead == 0 && is_unconscious == 0) {
                neuroClient.sendContext(`No current quests active.`, true);
              }
              questobjectives = [];
            }
          }
        }
      });
    });
  });
  //#endregion

                    });
                  });
                });
              });
            });
          });
        });
      });  
//#endregion

//#region Current Combat mode
      //register combat mode actions depending on neuro's current combat mode
      readFile(neurovegaspath + "current_combatmode.txt", 'utf-8', (err, combatmodedata) => {
        if (err) {
            console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
            return;
        }
    
        if (combatmodedata !== current_combatmode && combatmodedata !== "") {
            current_combatmode = combatmodedata;
            neuroClient.unregisterActions(['set_combat_mode_to_defensive','set_combat_mode_to_offensive']);
            if (current_combatmode == "0") {
                neuroClient.registerActions([set_combat_mode_to_defensive]);
            } else if (current_combatmode == "1") {
              neuroClient.registerActions([set_combat_mode_to_offensive]);
            }
        }
      });
    } else {
      ResetData();
    }



            });
          });
        });
      });
    //#endregion

    //#region Combat Context
  //register disengage combat action if neuro is in combat
  readFile(neurovegaspath + "is_in_combat.txt", 'utf-8', (err, combatdata) => {
    if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
    }

    readFile(neurovegaspath + "current_fleestate.txt", 'utf-8', (err, engagedata) => {
      if (err) {
          console.error(`[NeuroVegas] Error reading file: ${err.message}`);
          return;
      }
      readFile(nearbyhostilesFilePath, 'utf-8', (err, hostiledata) => {
        if (err) {
            console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
            return;
        }
          //send context whenever player kills someone
          readFile(playerattackFilePath, 'utf-8', (err, playerattackdata) => {
            if (err) {
                console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                return;
            }
                  //send context whenever neuro kills someone
            readFile(attackFilePath, 'utf-8', (err, attackdata) => {
              if (err) {
                  console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                  return;
              }

              readFile(totalammoFilePath, 'utf-8', (err, totalammodata) => {
              if (err) {
                  console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                  return;
              }



                if (attackdata != "0" && attackdata !== ""){
                  attack_data = attackdata;
                  kill = parseMultiLineString(attack_data);
                  if (kill.length > 3) {
                      if (Number(kill[2]) != neuro_kill_id) {
                        if (kill[3] == "Neuro-sama" || kill[3] == "Evil Neuro") {
                          if (kill[1] == "0") {
                            neuroClient.sendContext(`You killed ${kill[0]} with your bare fists.`);
                          } else {
                            if (Number(totalammodata) != -1 && Number(totalammodata) != 0) {
                              neuroClient.sendContext(`You killed ${kill[0]} with ${kill[1]}.\nAmmo remaining: ${totalammodata}`);
                            } else {
                              neuroClient.sendContext(`You killed ${kill[0]} with ${kill[1]}.`);
                            }
                          }
                      } else {
                        if (kill[3] == playername) {
                          player_stole_neuros_kill = 1;
                        }
                          if (kill[1] == "0") {
                            neuroClient.sendContext(`${kill[3]} killed ${kill[0]}.`,true);
                          } else {
                            neuroClient.sendContext(`${kill[3]} killed ${kill[0]} with ${kill[1]}.`,true);
                          }

                      }
                        neuro_kill_id = Number(kill[2]);
                        writeDataToFile("0","attack.txt");
                      }
                  }
                }
            

                if (playerattackdata !== playerattack_data && playerattackdata !== "") {
                  playerattack_data = playerattackdata;
                  if (playerattack_data != "0"){
                    playerkill = parseMultiLineString(playerattack_data);
                    if (playerkill.length > 2) {

                      if (Number(playerkill[2]) != player_kill_id) {
                        if (playerkill[1] == "0") {
                          if (player_stole_neuros_kill == 0) {
                            neuroClient.sendContext(`${playername} killed ${playerkill[0]} with their bare fists.`,true);     
                          } else {
                            player_stole_neuros_kill = 0;
                          }
                          player_kill_id = playerkill[2];
                        } else {
                          if (player_stole_neuros_kill == 0) {
                            neuroClient.sendContext(`${playername} killed ${playerkill[0]} with ${playerkill[1]}.`,true);
                          } else {
                            player_stole_neuros_kill = 0;
                          }
                          player_kill_id = playerkill[2];
                        }
                      }
                    }
                  }
              }
              
                if (hostiledata !== hostile_data && hostiledata !== "") {
                  hostile_data = hostiledata;
              }
              hostiles = hostile_data;
              hostiles = hostiles.replace(/\$/g, "");
              nearbyhostiles = parseMultiLineString(hostiles);
              current_fleestate = engagedata;
              if (combatdata !== combatstate && combatdata !== "") {

              combatstate = combatdata;
          


                if (combatstate == "0"  &&  current_fleestate == "0") {
                  //neuroClient.unregisterActions(['flee_from_combat','stop_fleeing']);
                  if (is_in_combat == 1) {
                    setTimeout(() => {
                      neuroClient.sendContext(`No more hostiles detected, combat has ended!\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                      writeDataToFile("0","nearbyhostiles.txt");
                      is_in_combat = 0;
                    }, 1000);
                  }
                } else if (combatstate == "1"  &&  current_fleestate == "0") {
                  if (current_fleestate == "0") {
                    if (is_unconscious == 0) {
                    // neuroClient.unregisterActions(['flee_from_combat','stop_fleeing']);
                    // neuroClient.registerActions([fleefromcombat]);
                    }
                    if (is_in_combat == 0) {
                      is_in_combat = 1;
                      if (nearbyhostiles.length == 1 && nearbyhostiles[0] == "0") {
                        neuroClient.sendContext(`Hostiles detected! Combat has been initiated!\nCurrent Weapon: ${current_weapon}\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                      } else if (nearbyhostiles.length == 1 && nearbyhostiles[0] != "0") {
                        neuroClient.sendContext(`Hostiles detected! Combat has been initiated against ${nearbyhostiles[0]}!\nCurrent Weapon: ${current_weapon}\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                      } else if (nearbyhostiles.length > 1) {
                        neuroClient.sendContext(`Hostiles detected! Combat has been initiated!\nNearby Hostiles: ${nearbyhostiles.join(', ')}\nCurrent Weapon: ${current_weapon}\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                      }
                    }
                  } else if (current_fleestate == "1") {
                    if (is_unconscious == 0) {
                      //neuroClient.unregisterActions(['flee_from_combat','stop_fleeing']);
                      //neuroClient.registerActions([stopfleeing]);
                    }
                  }
                }
              }



            }); 
          });  
        });  
      });
    });
  });
  //#endregion


    }
      writeDataToFile(String(disable_writing),"disable_writing.txt");
    });
  } else {
    ResetData();
  }
}
//#endregion


//#region Action Handler
//process actions and send results
neuroClient.onAction(actionData => {
  readFile(pausedFilePath, 'utf-8', (err, pausedata) => {
    if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
    }  

    readFile(isindialogueFilePath, 'utf-8', (err, isindialoguedata) => {
      if (err) {
          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
          return;
      }  
    if (pausedata != "") {
      is_paused = Number(pausedata);
    }
    if (currentlocation != "Endgame" && currentlocation != "Dead Money Narration" && currentlocation != "Old World Blue Narration" && currentlocation != "Slide Show Theatre Room") {
      if (is_paused == 0) {
        if (gamestate == 1) {
          if (isindialoguedata == "0") {
            if (is_unconscious == 0) {
              if (playerdead == 0) {
                if (actionData.name === 'check_health_status') {
                  readFile(limbFilePath, 'utf-8', (err, limbdata) => {
                    if (err) {
                      console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                      return;
                    }
                    if (limbdata !== "" && limbdata !== "-1"){
                      limbdata = parseMultiLineString(limbdata);
                      if (limbdata.length > 5) {
                        headhealth = Number(limbdata[0]);
                        torsohealth = Number(limbdata[1]);
                        leftarmhealth = Number(limbdata[2]);
                        rightarmhealth = Number(limbdata[3]);
                        leftleghealth = Number(limbdata[4]);
                        rightleghealth = Number(limbdata[5]);
                      }
                    }
                    if (headhealth != 0 && torsohealth != 0 && leftarmhealth != 0 && rightarmhealth != 0 && leftleghealth != 0 && rightleghealth != 0) {
                      neuroClient.sendActionResult(actionData.id, true, `Health is at: ${currenthealth}/${maxhealth}\nAll limbs are healthy!`)
                    } else {
                      let limbstring = "";
                      if (headhealth <= 0) {
                          limbstring += "Head has been crippled!\n";
                      }
                      if (torsohealth <= 0) {
                          limbstring += "Torso has been crippled!\n";
                      }
                      if (leftarmhealth <= 0) {
                          limbstring += "Left arm has been crippled!\n";
                      }
                      if (rightarmhealth <= 0) {
                          limbstring += "Right arm has been crippled!\n";
                      }
                      if (leftleghealth <= 0) {
                          limbstring += "Left leg has been crippled!\n";
                      }
                      if (rightleghealth <= 0) {
                          limbstring += "Right leg has been crippled!\n";
                      }
                      neuroClient.sendActionResult(actionData.id, true, `Health is at: ${currenthealth}/${maxhealth}\n${limbstring}`)
                    }
                  });

                  return;
                }  

                //check inventory
                if (actionData.name === 'check_inventory') {
                  if (inventoryopen == 0) {
                    readFile(inventory_namesFilePath, 'utf-8', (err, invdata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }
                      readFile(inventory_countFilePath, 'utf-8', (err, invcountdata) => {
                        if (err) {
                            console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                            return;
                        }
                        
                        if (invdata !== "0") {
                          invdata = invdata.replace(/\$/g, "");
                          invdata = parseMultiLineString(invdata);
                          invcountdata = parseMultiLineString(invcountdata);
                          
                          let inventoryMap = new Map();
                          for (let i = 0; i < invdata.length; i++) {
                            let item = invdata[i];
                            let count = Number(invcountdata[i]);
                            if (inventoryMap.has(item)) {
                              inventoryMap.set(item, inventoryMap.get(item) + count);
                            } else {
                              inventoryMap.set(item, count);
                            }
                          }

                          let invstring = "";
                          inventoryMap.forEach((count, item) => {
                            let itemString = `${item}`;
                            if (count > 1) {
                              itemString += ` (${count})`;
                            }
                            if (item === current_equipped_weapon) {
                              itemString += " (Equipped)";
                            }
                            if (invstring === "") {
                              invstring = itemString;
                            } else {
                              invstring += `, ${itemString}`;
                            }
                          });

                          neuroClient.sendActionResult(actionData.id, true, `Inventory currently contains: ${invstring}`);
                        } else {
                          neuroClient.sendActionResult(actionData.id, true, 'Your inventory is currently empty.');
                        }
                      });
                    });
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while ${playername} has your interaction menu open.`);
                  }
                  return;
                }
              //set combat mode to defensive
                if (actionData.name === 'set_combat_mode_to_defensive') {
                  writeDataToFile(String(1) + "\n" + String(1),"combatmode.txt");
                  neuroClient.unregisterActions(['set_combat_mode_to_defensive'])
                  neuroClient.sendActionResult(actionData.id, true, 'Combat mode set to: "Defensive", you will now only initiate combat in self-defense.')
                  return;
                }  

                //set combat mode to offensive
                if (actionData.name === 'set_combat_mode_to_offensive') {
                  writeDataToFile(String(1) + "\n" + String(0),"combatmode.txt");
                  neuroClient.unregisterActions(['set_combat_mode_to_offensive'])
                  neuroClient.sendActionResult(actionData.id, true, 'Combat mode set to: "Offensive", you will now attack all hostiles on sight.')
                  return;
                }  

                //hold position and stop following the player
                if (actionData.name === 'stop_following') {
                  if (inventoryopen == 0) {
                    if (is_sitting == 0){
                      writeDataToFile(String(1) + "\n" + String(1),"follow.txt");
                      neuroClient.unregisterActions(['stop_following'])
                      neuroClient.sendActionResult(actionData.id, true, 'You are no longer following ' + playername + '.')
                    } else {
                      neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while sitting down.`)
                    }
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while ${playername} has your interaction menu open.`)
                  }
                  return;
                }  

                //resume following the player
                if (actionData.name === 'resume_following') {
                  if (inventoryopen == 0) {
                    if (is_sitting == 0){
                      writeDataToFile(String(1) + "\n" + String(0),"follow.txt");
                      neuroClient.unregisterActions(['resume_following'])
                      neuroClient.sendActionResult(actionData.id, true, 'You have resumed following ' + playername + '.')
                    } else {
                      neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while sitting down.`)
                    }
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while ${playername} has your interaction menu open.`)
                  }
                  return;
                }  
                /*
                // Scrapped mechanic where neuro could call an action during combat to start fleeing, couldnt get it working in a way that i liked so i scrapped it
                if (actionData.name === 'flee_from_combat') {
                  if (is_in_combat == 1) {
                    writeDataToFile(String(1) + "\n" + String(1),"flee.txt");
                    neuroClient.unregisterActions(['flee_from_combat'])
                    neuroClient.sendActionResult(actionData.id, true, 'You are now fleeing from the enemy!')
                    neuroClient.registerActions([stopfleeing])
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, "You must be engaged in combat to use this action!")
                  }
                  return;
                }  

                //re-engage combat
                if (actionData.name === 'stop_fleeing') {
                  if (is_in_combat == 1) {
                    writeDataToFile(String(1) + "\n" + String(0),"flee.txt");
                    neuroClient.unregisterActions(['stop_fleeing'])
                    neuroClient.sendActionResult(actionData.id, true, 'You have stopped fleeing and have resumed fighting the enemy!')
                    neuroClient.registerActions([fleefromcombat])
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, "You must be engaged in combat to use this action!")
                  }
                  return;
                }  */

                //equip the chosen weapon
                if (actionData.name === 'equip_weapon') {
                  if (inventoryopen == 0) {
                    readFile(neurovegaspath + "validweapons_name.txt", 'utf-8', (err, equipdata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }     
                      if (equipdata !== "0") {
                        equipdata = equipdata.replace(/\$/g, "");
                        equipdata = parseMultiLineString(equipdata);
                        const selectedwep = actionData.params.weapon_select;
                        const weaponindex = equipdata.findIndex(item => item.toLowerCase() === selectedwep.toLowerCase());
                        if (weaponindex !== -1) {
                          neuroClient.unregisterActions(['equip_weapon']);
                          writeDataToFile(String(1) + "\n" + String(weaponindex),"weapon_to_equip.txt");
                          neuroClient.sendActionResult(actionData.id, true, selectedwep + " has been equipped.");
                          current_weapon = selectedwep;
                          neuroClient.registerActions([unequipweapon]);
                        } else {
                          neuroClient.sendActionResult(actionData.id, false,  selectedwep + ' is not a valid weapon!');
                        }
                      } else {
                        neuroClient.unregisterActions(['equip_weapon']);
                        neuroClient.sendActionResult(actionData.id, false,  'There are no weapons in your inventory to equip!');
                      }
                    });
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `Weapons cannot be equipped while ${playername} has your interaction menu open.`);
                  }
                  weapon_action_force = 0;
                  writeDataToFile("0","weaponforce.txt");
                  return;
                }

                //unequip the currently equipped weapon
                if (actionData.name === 'unequip_weapon') {
                  if (inventoryopen == 0) {
                    readFile(currentweaponFilePath, 'utf-8', (err, weapondata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }
                      if (weapondata !== "0") {
                        writeDataToFile(String(1) + "\n" + String(-1),"weapon_to_equip.txt");
                        neuroClient.unregisterActions(['unequip_weapon']);
                        neuroClient.sendActionResult(actionData.id, true, current_weapon + " has been un-equipped.");
                      } else {
                        neuroClient.unregisterActions(['unequip_weapon']);
                        neuroClient.sendActionResult(actionData.id, false,  'You have no weapon to unequip!');
                      }
                    });
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `Weapons cannot be unequipped while ${playername} has your interaction menu open.`);
                  }
                  return;
                }  

                //initiates the aid consumption process
                if (actionData.name === 'use_consumable') {
                  if (inventoryopen == 0) {
                    readFile(neurovegaspath + "aid_names.txt", 'utf-8', (err, aiddata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }
                      if (aiddata !== "0") {
                        aiddata = aiddata.replace(/\$/g, "");
                        aiddata = parseMultiLineString(aiddata);
                        const selectedaid = actionData.params.consumable_select;
                        const aidindex = aiddata.findIndex(item => item.toLowerCase() === selectedaid.toLowerCase());
                        if (aidindex !== -1) {
                          writeDataToFile(String(1) + "\n" + String(aidindex),"aid_to_use.txt");
                          if (consumableMap[selectedaid] == "Food") {
                            const foodResponses = [
                              `You ate ${selectedaid}! Yummy!`,
                              `You ate ${selectedaid}! Delicious!`,
                              `You ate ${selectedaid}! Tasty!`,
                              `You ate ${selectedaid}! Mmmmm, tastes good!`,
                              `You ate ${selectedaid}! Tastes... meh...`,
                              `You ate ${selectedaid}! Not bad!`
                            ];
                            const randomResponse = foodResponses[Math.floor(Math.random() * foodResponses.length)];
                            neuroClient.sendActionResult(actionData.id, true, randomResponse);
                          } else if (consumableMap[selectedaid] == "Drink") {
                            if (selectedaid == "Irradiated water") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "You feel well hydrated, but also a little queasy...");
                            } else if (selectedaid == "Blood pack") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "It tastes like metal...");
                            } else if (selectedaid == "Nightstalker squeezin's") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "You feel sneakier...");
                            } else if (selectedaid == "Dirty water") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "The taste isn't great, but you still feel hydrated.");
                            } else if (selectedaid == "Purified water") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "You feel well hydrated!");
                            } else if (selectedaid == "Nuka-Cola" || selectedaid == "Nuka-Cola Quantum" || selectedaid == "Nuka-Cola Quartz" || selectedaid == "Nuka-Cola Victory") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "You feel refreshed!");
                            } else {
                              neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! ");
                            }
                          } else if (consumableMap[selectedaid] == "Alcohol") {
                            neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "You feel a little tipsy...");
                          } else if (consumableMap[selectedaid] == "Chem") {
                            if (selectedaid == "Stimpak" || selectedaid == "Super stimpak") {
                              neuroClient.sendActionResult(actionData.id, true, "You injected a " + selectedaid + "! " + "You can feel your wounds beginning to heal!");
                            } else if (selectedaid == "RadAway") {
                              neuroClient.sendActionResult(actionData.id, true, "You consumed " + selectedaid + "! " + "You can feel the radiation leaving your body!");
                            } else if (selectedaid == "Rad-X") {
                              neuroClient.sendActionResult(actionData.id, true, "You consumed " + selectedaid + "! " + "You feel a little less vulnerable to radiation!");
                            } else if (selectedaid == "Med-X") {
                              neuroClient.sendActionResult(actionData.id, true, "You injected " + selectedaid + "! " + "You can feel your pain fading away! (+25 Damage Resistance for 4 minutes)");
                            } else if (selectedaid == "Psycho") {
                              neuroClient.sendActionResult(actionData.id, true, "You injected " + selectedaid + "! " + "You feel like you can take on the world! (+25% Damage for 4 minutes)");
                            } else if (selectedaid == "Slasher") {
                              neuroClient.sendActionResult(actionData.id, true, "You injected " + selectedaid + "! " + "You feel invincible! (+25% Damage and +25 Damage Resistance for 1 minute)");
                            } else if (selectedaid == "Turbo") {
                              neuroClient.sendActionResult(actionData.id, true, "You inhaled " + selectedaid + "! " + "Time feels like it's moving in slow motion...");
                            } else if (selectedaid == "Fixer") {
                              neuroClient.sendActionResult(actionData.id, true, "You took some " + selectedaid + "! You feel a little woozy."); 
                            } else if (selectedaid == "Mentats") {
                              neuroClient.sendActionResult(actionData.id, true, "You took some " + selectedaid + "! " + "You feel smarter! (+2 Intelligence, +2 Perception, and +1 Charisma for 4 minutes)");
                            } else if (selectedaid == "Party Time Mentats") {
                              neuroClient.sendActionResult(actionData.id, true, "You took some " + selectedaid + "! " + "You feel smarter and more charismatic! (+2 Intelligence, +2 Perception, and +5 Charisma for 1 minute)");
                            } else if (selectedaid == "Jet" || selectedaid == "Dixon's Jet") {
                              neuroClient.sendActionResult(actionData.id, true, "You inhaled " + selectedaid + "! " + "Ohhh yeah, that feels good!");
                            } else if (selectedaid == "Ultrajet") {
                              neuroClient.sendActionResult(actionData.id, true, "You inhaled " + selectedaid + "! " + "Ohhh yeah, that feels really good!");
                            } else if (selectedaid == "Buffout") {
                              neuroClient.sendActionResult(actionData.id, true, "You took some " + selectedaid + "! " + "You can feel your body getting stronger! (+2 Strength, +3 Endurance, and +60 max HP for 4 minutes)");
                            } else if (selectedaid == "Doctor's bag" || selectedaid == "Medical supplies") {
                              neuroClient.sendActionResult(actionData.id, true, "You used " + selectedaid + "! " + "Your limbs have never felt better! (All limb damage repaired)");
                            } else if (selectedaid == "Steady") {
                              neuroClient.sendActionResult(actionData.id, true, "You inhaled " + selectedaid + "! " + "You can feel your hands begin to relax. (Weapon spread has been reduced for 1 minute)");
                            } else if (selectedaid == "Antivenom" || selectedaid == "Datura antivenom") {
                              neuroClient.sendActionResult(actionData.id, true, "You drank some " + selectedaid + "! " + "Any and all poison effects have been cured!"); 
                            } else {
                              neuroClient.sendActionResult(actionData.id, true, "You used " + selectedaid + "! "); 
                            }
                          } else if (consumableMap[selectedaid] == "Poison") {
                            neuroClient.sendActionResult(actionData.id, true, "You drank " + selectedaid + "! " + "You begin to feel very sick...");
                          } else if (selectedaid == "Weapon repair kit"){
                            neuroClient.sendActionResult(actionData.id, true, "You used " + selectedaid + "! " + "Your weapon's condition has been improved!");
                          } else if (selectedaid == "Stealth Boy"){
                            neuroClient.sendActionResult(actionData.id, true, "You used " + selectedaid + "! " + "You have turned invisible for 2 minutes!");
                          } else {
                            neuroClient.sendActionResult(actionData.id, true, "You used " + selectedaid + "!");
                          }
                        } else {
                          neuroClient.sendActionResult(actionData.id, false, selectedaid + ' is not a valid consumable!');
                        }
                      } else {
                        neuroClient.unregisterActions(['use_consumable']);
                        neuroClient.sendActionResult(actionData.id, false,  'There are no consumable items in your inventory to use!');
                      }
                    });
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `Consumables cannot be used while ${playername} has your interaction menu open.`);
                  }
                  return;
                }

                //initiates the ammo switching process
                if (actionData.name === 'switch_ammo') {
                  if (inventoryopen == 0) {
                    readFile(neurovegaspath + "ammo_names.txt", 'utf-8', (err, ammodata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }
                      if (ammodata !== "0") {
                        ammodata = ammodata.replace(/\$/g, "");
                        ammodata = parseMultiLineString(ammodata);
                        const selectedammo = actionData.params.ammo_select;
                        const ammoindex = ammodata.findIndex(item => item.toLowerCase() === selectedammo.toLowerCase());
                        if (ammoindex !== -1) {
                          writeDataToFile(String(1) + "\n" + String(ammoindex),"ammo_to_equip.txt");
                          neuroClient.unregisterActions(['switch_ammo']);
                          neuroClient.sendActionResult(actionData.id, true, 'Ammo type has been swapped to ' + selectedammo);
                        } else {
                          neuroClient.sendActionResult(actionData.id, false, selectedammo + ' is not a valid ammo type!');
                        }
                      } else {
                        neuroClient.unregisterActions(['switch_ammo']);
                        neuroClient.sendActionResult(actionData.id, false, 'There are no alternate ammo types in your inventory to switch to!');
                      }
                    });
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, `Ammunition type cannot be switched while ${playername} has your interaction menu open.`);
                  }
                  return;
                }

                //makes neuro jump in-game (because why not)
                if (actionData.name === 'jump') {
                  if (is_sitting == 0) {
                    writeDataToFile(String(1),"jump.txt");
                    neuroClient.sendActionResult(actionData.id, true, "You have successfully jumped.");
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, "You cannot jump while sitting down.");
                  }
                  return;
                }  

                if (actionData.name === 'save_game') {
                  if (is_in_combat == 0) {
                    writeDataToFile(String(1),"savegame.txt");
                    neuroClient.sendActionResult(actionData.id, true, "Game has been saved!");
                  } else {
                    neuroClient.sendActionResult(actionData.id, false, "You cannot save while in combat!");
                  }
                  return;
                }

              } else {
                if (weapon_action_force == 1) {
                  neuroClient.sendActionResult(actionData.id, true, `Error! You cannot perform actions while ${playername} is dead! Please wait for a previous save to be loaded.`)
                  weapon_action_force = 0;
                  writeDataToFile("0","weaponforce.txt");
                } else if(weapon_action_force == 0) {
                  neuroClient.sendActionResult(actionData.id, false, `You cannot perform actions while ${playername} is dead! Please wait for a previous save to be loaded.`)
                }
                return;
              }
            } else {
              if (weapon_action_force == 1) {
                neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions while unconscious.')
                weapon_action_force = 0;
                writeDataToFile("0","weaponforce.txt");
              } else if(weapon_action_force == 0) {
                neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions while unconscious.')
              }
              return;
            }
          } else {
            if (weapon_action_force == 1) {
              neuroClient.sendActionResult(actionData.id, true, `Error! You cannot perform actions ${playername} is in dialogue.`)
              weapon_action_force = 0;
              writeDataToFile("0","weaponforce.txt");
            } else if(weapon_action_force == 0) {
              neuroClient.sendActionResult(actionData.id, false, `You cannot perform actions while ${playername} is in dialogue.`)
            }
            return;
          }
        } else {
          if (weapon_action_force == 0) {
            if (gamestate == 0) {
              neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions while on the main menu. Please wait for the game to start.')
            } else if (gamestate == 2) {
              neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions during a loading screen.')
            } else if (gamestate == -1) {
              neuroClient.sendActionResult(actionData.id, false, "You cannot perform actions while the game isn't running.")
            }
          } else if (weapon_action_force == 1) {
            if (gamestate == 0) {
              neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions while on the main menu. Please wait for the game to start.')
            } else if (gamestate == 2) {
              neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions during a loading screen.')
            } else if (gamestate == -1) {
              neuroClient.sendActionResult(actionData.id, true, "Error! You cannot perform actions while the game isn't running.")
            }
            weapon_action_force = 0;
            writeDataToFile("0","weaponforce.txt");
          }
          return;
        }
      } else {
        if (weapon_action_force == 0) {
          neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions while the game is paused! Please wait for the game to resume.')
        } else if (weapon_action_force == 1) {
          neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions while the game is paused! Please wait for the game to resume.')
          weapon_action_force = 0;
          writeDataToFile("0","weaponforce.txt");
        }
        return;
      }
    } else {
      if (weapon_action_force == 0) {
        neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions during a cutscene!')
      } else if (weapon_action_force == 1) {
        neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions during a cutscene!')
        weapon_action_force = 0;
        writeDataToFile("0","weaponforce.txt");
      }
      return;
    }

  neuroClient.sendActionResult(actionData.id, false, 'Unknown action.')
    });
});
})