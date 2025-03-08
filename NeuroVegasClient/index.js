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
        player_was_dead = 0;
        playerdead = 0;
        isRunning = true;
        console.log('[NeuroVegas] New Vegas is running.');
      }
    } else {
      if (isRunning) {
        isRunning = false;
        player_was_dead = 0;
        playerdead = 0;
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
          console.log('[NeuroVegas] New Vegas was closed, all actions have been unregistered.');
        }
        startupcontextsent = 0;
        ResetData();
        neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'switch_to_passive_mode', 'switch_to_aggressive_mode', 'check_inventory', 'save_game','check_health_status','check_inventory']);
        if (waiting_for_action_result == 1) {
          waiting_for_action_result = 0;
          if (weapon_action_force ==  1) {
            neuroClient.sendActionResult(actionresult_data.id, true, "Error! Previous action was cancelled because the game was closed.");
          } else {
            neuroClient.sendActionResult(actionresult_data.id, false, "Previous action was cancelled because the game was closed.");
          }
          writeDataToFile("0","equipresult.txt");
          writeDataToFile("0","unequipresult.txt");
          writeDataToFile("0","aidresult.txt");
          writeDataToFile("0","ammoresult.txt");
          writeDataToFile("0","jumpresult.txt");
          writeDataToFile("0","stopfollowresult.txt");
          writeDataToFile("0","resumefollowresult.txt");
          writeDataToFile("0","setdefensiveresult.txt");
          writeDataToFile("0","setoffensiveresult.txt");
          writeDataToFile("0","saveresult.txt");
        }
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
let player_was_dead = 0;

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

let waiting_for_action_result = 0;
let actionresult_data = 0;
let weapon_to_equip = "";
let consumable_to_use = "";
let ammo_to_equip = "";

let waiting_for_equip_result = 0;
let waiting_for_aid_result = 0;
let waiting_for_ammo_result = 0;
let waiting_for_follow_result = 0;
let waiting_for_combatmoderesult = 0;
let waiting_for_save_result = 0;
let waiting_for_jump_result = 0;

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

function ResetDataKnocked() {
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
const equipresultFilePath = writeDataToFile("0","equipresult.txt");
const unequipresultFilePath = writeDataToFile("0","unequipresult.txt");
const aidresultFilePath = writeDataToFile("0","aidresult.txt");
const ammoresultFilePath = writeDataToFile("0","ammoresult.txt");
const jumpresultFilePath = writeDataToFile("0","jumpresult.txt");
const stopfollowresultFilePath = writeDataToFile("0","stopfollowresult.txt");
const resumefollowresultFilePath = writeDataToFile("0","resumefollowresult.txt");
const setdefensiveresultFilePath = writeDataToFile("0","setdefensiveresult.txt");
const setoffensiveresultFilePath = writeDataToFile("0","setoffensiveresult.txt");
const saveresultFilePath = writeDataToFile("0","saveresult.txt");
writeDataToFile("0","weaponforce.txt");
writeDataToFile("0","ammoforce.txt");
writeDataToFile("0","aidforce.txt");

console.log(`[NeuroVegas] Data Files Initalized at : ${neurovegaspath}`);


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

let switch_to_passive_mode = {
  name: 'switch_to_passive_mode',
  description: "Switches from Aggressive mode to Passive mode. When in Passive mode, you will wait for the player to attack first.",
  schema: {},
}

const switch_to_aggressive_mode = {
  name: 'switch_to_aggressive_mode',
  description: "Switches from Passive mode to Aggressive mode. When in Aggressive mode, you will attack all hostiles on sight.",
  schema: {},
}

/*
const fleefromcombat = {
  name: 'flee_from_combat',
  description: 'When in combat, allows you to flee from the enemy. Useful if you think you are outmatched.',
  schema: {},
}

const stopfleeing = {
  name: 'stop_fleeing',
  description: 'After fleeing from combat, allows you to stop fleeing and resume fighting.',
  schema: {},
}*/

let stopfollowing = {
  name: 'stop_following',
  description: 'Allows you to stop following the player and remain in place at your current position.',
  schema: {},
}

let resumefollowing = {
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
  "ant egg": "Food",
  "ant meat": "Food",
  "barrel cactus fruit": "Food",
  "banana yucca fruit": "Food",
  "bighorner meat": "Food",
  "bighorner steak": "Food",
  "black blood sausage": "Food",
  "blamco mac & cheese": "Food",
  "bloatfly meat": "Food",
  "bloatfly slider": "Food",
  "blood sausage": "Food",
  "brahmin meat": "Food",
  "brahmin steak": "Food",
  "brahmin wellington": "Food",
  "broc flower": "Food",
  "bubble gum": "Food",
  "buffalo gourd seed": "Food",
  "caravan lunch": "Food",
  "cave fungus": "Food",
  "cazador egg": "Food",
  "cook-cook's fiend stew": "Food",
  "coyote meat": "Food",
  "coyote steak": "Food",
  "cram": "Food",
  "crispy squirrel bits": "Food",
  "crunchy mutfruit": "Food",
  "dandy boy apples": "Food",
  "daturana": "Food",
  "desert salad": "Food",
  "dog meat": "Food",
  "dog steak": "Food",
  "fancy lads snack cakes": "Food",
  "fire ant egg": "Food",
  "fire ant fricassée": "Food",
  "fire ant meat": "Food",
  "fresh apple": "Food",
  "fresh carrot": "Food",
  "fresh pear": "Food",
  "fresh potato": "Food",
  "gecko kebab": "Food",
  "gecko meat": "Food",
  "gecko steak": "Food",
  "giant rat meat": "Food",
  "grilled mantis": "Food",
  "gum drops": "Food",
  "honey mesquite pod": "Food",
  "human flesh": "Food",
  "human remains": "Food",
  "iguana bits": "Food",
  "iguana-on-a-stick": "Food",
  "imitation strange meat pie": "Food",
  "instamash": "Food",
  "irr. banana yucca": "Food",
  "irr. barrel cactus": "Food",
  "irr. mac & cheese": "Food",
  "irradiated cram": "Food",
  "irr. crunchy mutfruit": "Food",
  "irr. dandy boy apples": "Food",
  "irr. fancy lads": "Food",
  "irr. gecko meat": "Food",
  "irradiated instamash": "Food",
  "irradiated mutfruit": "Food",
  "irr. pork n' beans": "Food",
  "irridiated potato": "Food",
  "irr. potato crisps": "Food",
  "irr. salisbury steak": "Food",
  "irr. sugar bombs": "Food",
  "irr. yumyum d. eggs": "Food",
  "jalapeño pepper": "Food",
  "junk food": "Food",
  "lakelurk egg": "Food",
  "lakelurk meat": "Food",
  "maize": "Food",
  "mole rat meat": "Food",
  "mole rat stew": "Food",
  "mre": "Food",
  "mushroom cloud": "Food",
  "mutant cave fungus": "Food",
  "mutfruit": "Food",
  "nevada agave fruit": "Food",
  "nightstalker tail": "Food",
  "noodles": "Food",
  "pinto bean pod": "Food",
  "pinyon nut": "Food",
  "pork n' beans": "Food",
  "potato crisps": "Food",
  "preserved meat": "Food",
  "pre-war steak": "Food",
  "prickly pear fruit": "Food",
  "radroach meat": "Food",
  "rat meat": "Food",
  "ruby's casserole": "Food",
  "sacred datura root": "Food",
  "salient green": "Food",
  "salisbury steak": "Food",
  "spore carrier sap": "Food",
  "spore plant pods": "Food",
  "squirrel on a stick": "Food",
  "squirrel stew": "Food",
  "strange meat": "Food",
  "strange meat pie": "Food",
  "sugar bombs": "Food",
  "thick red paste": "Food",
  "thin red paste": "Food",
  "trail mix": "Food",
  "wasteland omelet": "Food",
  "white horsenettle": "Food",
  "xander root": "Food",
  "yao guai meat": "Food",
  "yumyum deviled eggs": "Food",
  "absinthe": "Drink",
  "atomic cocktail": "Alcohol",
  "battle brew": "Alcohol",
  "beer": "Alcohol",
  "bitter drink": "Drink",
  "black coffee": "Drink",
  "blood pack": "Drink",
  "dirty water": "Drink",
  "dixon's whiskey": "Alcohol",
  "ice cold nuka-cola": "Drink",
  "irradiated beer": "Alcohol",
  "irradiated scotch": "Alcohol",
  "irradiated sunset sarsaparilla": "Drink",
  "irradiated water": "Drink",
  "irradiated whiskey": "Alcohol",
  "jake juice": "Alcohol",
  "large wasteland tequila": "Alcohol",
  "moonshine": "Alcohol",
  "nightstalker squeezin's": "Drink",
  "nuka-cola": "Drink",
  "nuka-cola quantum": "Drink",
  "nuka-cola quartz": "Drink",
  "nuka-cola victory": "Drink",
  "purified water": "Drink",
  "rum & nuka": "Alcohol",
  "scotch": "Alcohol",
  "sierra madre martini": "Alcohol",
  "sunset sarsaparilla": "Drink",
  "vodka": "Alcohol",
  "wasteland tequila": "Alcohol",
  "whiskey": "Alcohol",
  "wine": "Alcohol",
  "ant queen pheromones": "Chem",
  "antivenom": "Chem",
  "ant nectar": "Chem",
  "auto-inject stimpak": "Chem",
  "auto-inject super stimpak": "Chem",
  "blood shield": "Chem",
  "buffout": "Chem",
  "cateye": "Chem",
  "coyote tobacco chew": "Chem",
  "datura antivenom": "Chem",
  "datura hide": "Chem",
  "dixon's jet": "Chem",
  "doctor's bag": "Chem",
  "fiery purgative": "Chem",
  "fire ant nectar": "Chem",
  "fixer": "Chem",
  "ghost sight": "Chem",
  "healing poultice": "Chem",
  "healing powder": "Chem",
  "hydra": "Chem",
  "jet": "Chem",
  "med-x": "Chem",
  "medical supplies": "Chem",
  "mentats": "Chem",
  "party time mentats": "Chem",
  "psycho": "Chem",
  "rad-x": "Chem",
  "radaway": "Chem",
  "rebound": "Chem",
  "rocket": "Chem",
  "rushing water": "Chem",
  "slasher": "Chem",
  "steady": "Chem",
  "stimpak": "Chem",
  "super stimpak": "Chem",
  "turbo": "Chem",
  "ultrajet": "Chem",
  "weapon binding ritual": "Chem",
  "bleak venom": "Poison",
  "cloud kiss": "Poison",
  "dark datura": "Poison",
  "mother darkness": "Poison",
  "silver sting": "Poison",
  "tremble": "Poison",
};
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


//#region Action Results
if (waiting_for_action_result == 1) {
  if (actionresult_data.name == "equip_weapon") {
    readFile(equipresultFilePath, 'utf-8', (err, equipresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (equipresultdata !== "" && inventoryopen == 0) {
        if (equipresultdata == "1") {
          writeDataToFile("0","equipresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, weapon_to_equip + " has been equipped.");
          current_weapon = weapon_to_equip;
          weapon_to_equip = "";
          neuroClient.registerActions([unequipweapon]);
          waiting_for_action_result = 0;
        } else if (equipresultdata == "2") {
          writeDataToFile("0","equipresult.txt");
          writeDataToFile("0","weapon_to_equip.txt"); 
          neuroClient.sendActionResult(actionresult_data.id, false, weapon_to_equip + " could not be equipped because it is not in your inventory.");
          weapon_to_equip = "";
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "use_consumable") {
    readFile(aidresultFilePath, 'utf-8', (err, aidresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (aidresultdata !== "" && inventoryopen == 0) {
        if (aidresultdata == "1") {
          writeDataToFile("0","aidresult.txt");
          const consumableType = consumableMap[consumable_to_use.toLowerCase()];  
          if (consumableType == "Food") {
            const foodResponses = [
              `You ate ${consumable_to_use}, yummy!`,
              `You ate ${consumable_to_use}, delicious!`,
              `You ate ${consumable_to_use}, tasty!`,
              `You ate ${consumable_to_use}, tastes good!`,
              `You ate ${consumable_to_use}, tastes meh...`
            ];
            const randomResponse = foodResponses[Math.floor(Math.random() * foodResponses.length)];
            neuroClient.sendActionResult(actionresult_data.id, true, randomResponse);
          } else if (consumableType == "Drink") {
            if (consumable_to_use == "Irradiated water") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "You feel well hydrated, but also a little queasy...");
            } else if (consumable_to_use == "Blood pack") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "It tastes like metal...");
            } else if (consumable_to_use == "Nightstalker squeezin's") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "You feel sneakier...");
            } else if (consumable_to_use == "Dirty water") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "The taste isn't great, but you still feel hydrated.");
            } else if (consumable_to_use == "Purified water") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "You feel well hydrated!");
            } else if (consumable_to_use == "Nuka-Cola" || consumable_to_use == "Nuka-Cola Quantum" || consumable_to_use == "Nuka-Cola Quartz" || consumable_to_use == "Nuka-Cola Victory") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "You feel refreshed!");
            } else {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! ");
            }
          } else if (consumableType == "Alcohol") {
            neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "You feel a little tipsy...");
          } else if (consumableType == "Chem") {
            if (consumable_to_use == "Stimpak" || consumable_to_use == "Super stimpak") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You injected a " + consumable_to_use + "! " + "You can feel your wounds beginning to heal!");
            } else if (consumable_to_use == "RadAway") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You consumed " + consumable_to_use + "! " + "You can feel the radiation leaving your body!");
            } else if (consumable_to_use == "Rad-X") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You consumed " + consumable_to_use + "! " + "You feel a little less vulnerable to radiation!");
            } else if (consumable_to_use == "Med-X") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You injected " + consumable_to_use + "! " + "You can feel your pain fading away! (+25 Damage Resistance for 4 minutes)");
            } else if (consumable_to_use == "Psycho") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You injected " + consumable_to_use + "! " + "You feel like you can take on the world! (+25% Damage for 4 minutes)");
            } else if (consumable_to_use == "Slasher") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You injected " + consumable_to_use + "! " + "You feel invincible! (+25% Damage and +25 Damage Resistance for 1 minute)");
            } else if (consumable_to_use == "Turbo") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You inhaled " + consumable_to_use + "! " + "Time feels like it's moving in slow motion...");
            } else if (consumable_to_use == "Fixer") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You took some " + consumable_to_use + "! You feel a little woozy."); 
            } else if (consumable_to_use == "Mentats") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You took some " + consumable_to_use + "! " + "You feel smarter! (+2 Intelligence, +2 Perception, and +1 Charisma for 4 minutes)");
            } else if (consumable_to_use == "Party Time Mentats") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You took some " + consumable_to_use + "! " + "You feel smarter and more charismatic! (+2 Intelligence, +2 Perception, and +5 Charisma for 1 minute)");
            } else if (consumable_to_use == "Jet" || consumable_to_use == "Dixon's Jet") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You inhaled " + consumable_to_use + "! " + "Ohhh yeah, that feels good!");
            } else if (consumable_to_use == "Ultrajet") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You inhaled " + consumable_to_use + "! " + "Ohhh yeah, that feels really good!");
            } else if (consumable_to_use == "Buffout") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You took some " + consumable_to_use + "! " + "You can feel your body getting stronger! (+2 Strength, +3 Endurance, and +60 max HP for 4 minutes)");
            } else if (consumable_to_use == "Doctor's bag" || consumable_to_use == "Medical supplies") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You used " + consumable_to_use + "! " + "Your limbs have never felt better! (All limb damage repaired)");
            } else if (consumable_to_use == "Steady") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You inhaled " + consumable_to_use + "! " + "You can feel your hands begin to relax. (Weapon spread has been reduced for 1 minute)");
            } else if (consumable_to_use == "Antivenom" || consumable_to_use == "Datura antivenom") {
              neuroClient.sendActionResult(actionresult_data.id, true, "You drank some " + consumable_to_use + "! " + "Any and all poison effects have been cured!"); 
            } else {
              neuroClient.sendActionResult(actionresult_data.id, true, "You used " + consumable_to_use + "! "); 
            }
          } else if (consumableType == "Poison") {
            neuroClient.sendActionResult(actionresult_data.id, true, "You drank " + consumable_to_use + "! " + "You begin to feel very sick...");
          } else if (consumable_to_use == "Weapon repair kit"){
            neuroClient.sendActionResult(actionresult_data.id, true, "You used " + consumable_to_use + "! " + "Your weapon's condition has been improved!");
          } else if (consumable_to_use == "Stealth Boy"){
            neuroClient.sendActionResult(actionresult_data.id, true, "You used " + consumable_to_use + "! " + "You have turned invisible for 2 minutes!");
          } else {
            neuroClient.sendActionResult(actionresult_data.id, true, "You used " + consumable_to_use + "!");
          }
          consumable_to_use = "";
          waiting_for_action_result = 0;
        } else if (aidresultdata == "2") {
          writeDataToFile("0","aidresult.txt");
          writeDataToFile("0","aid_to_use.txt");
          neuroClient.sendActionResult(actionresult_data.id, false, consumable_to_use + " could not be used because it is not in your inventory.");
          consumable_to_use = "";
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "switch_ammo") {
    readFile(ammoresultFilePath, 'utf-8', (err, ammoresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (ammoresultdata !== "" && inventoryopen == 0) {
        if (ammoresultdata == "1") {
          writeDataToFile("0","ammoresult.txt");
          writeDataToFile("0","ammo_to_equip.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, 'Ammo type for ' + current_weapon + ' has been swapped to ' + ammo_to_equip);
          ammo_to_equip = "";
          waiting_for_action_result = 0;
        } else if (ammoresultdata == "2") {
          writeDataToFile("0","ammoresult.txt");
          writeDataToFile("0","ammo_to_equip.txt");
          neuroClient.sendActionResult(actionresult_data.id, false, ammo_to_equip + " could not be loaded because it is not in your inventory.");
          ammo_to_equip = "";
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "unequip_weapon") {
    readFile(unequipresultFilePath, 'utf-8', (err, unequipresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (unequipresultdata !== "" && inventoryopen == 0) {
        if (unequipresultdata == "1") {
          writeDataToFile("0","unequipresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, current_weapon + " has been un-equipped.");
          current_weapon = "0";
          waiting_for_action_result = 0;
        } else if (unequipresultdata == "2") {
          writeDataToFile("0","unequipresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, false, "No weapon is currently equipped.");
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "stop_following") {
    readFile(stopfollowresultFilePath, 'utf-8', (err, stopfollowresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (stopfollowresultdata !== "") {
        if (stopfollowresultdata == "1") {
          writeDataToFile("0","stopfollowresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, `You have stopped following ${playername}.`);
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "resume_following") {
    readFile(resumefollowresultFilePath, 'utf-8', (err, resumefollowresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (resumefollowresultdata !== "") {
        if (resumefollowresultdata == "1") {
          writeDataToFile("0","resumefollowresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, `You have resumed following ${playername}.`);
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "switch_to_passive_mode") {
    readFile(setdefensiveresultFilePath, 'utf-8', (err, setdefensiveresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (setdefensiveresultdata !== "") {
        if (setdefensiveresultdata == "1") {
          writeDataToFile("0","setdefensiveresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, 'You have switched to Passive mode, you will now wait for the player to attack first before entering combat.');
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "switch_to_aggressive_mode") {
    readFile(setoffensiveresultFilePath, 'utf-8', (err, setoffensiveresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (setoffensiveresultdata !== "") {
        if (setoffensiveresultdata == "1") {
          writeDataToFile("0","setoffensiveresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, 'You have switched to Aggressive mode, you will now attack all enemies on sight.');
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "save_game") {
    readFile(saveresultFilePath, 'utf-8', (err, saveresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (saveresultdata !== "") {
        if (saveresultdata == "1") {
          writeDataToFile("0","saveresult.txt");
          if (is_in_combat == 1) {
            neuroClient.sendActionResult(actionresult_data.id, false, "You cannot save the game while in combat!");
          } else {
            neuroClient.sendActionResult(actionresult_data.id, true, "Game has been saved!");
          }
          waiting_for_action_result = 0;
        }
      }
    });
  } else if (actionresult_data.name == "jump") {
    readFile(jumpresultFilePath, 'utf-8', (err, jumpresultdata) => {
      if (err) {
        console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
        return;
      }
      if (jumpresultdata !== "") {
        if (jumpresultdata == "1") {
          writeDataToFile("0","jumpresult.txt");
          neuroClient.sendActionResult(actionresult_data.id, true, "You have performed a jump!");
          waiting_for_action_result = 0;
        }
      }
    });
  }
}
//#endregion


    //game state values
    //-1 = game not open
    //0 = main menu
    //1 = in-game
    //2 = loading
    //#region Startup Context
    //update game state
    isProgramRunning('FalloutNV').then(isRunningNow => {
    
    if (isRunningNow == true) {


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

                switch_to_passive_mode = {
                  name: 'switch_to_passive_mode',
                  description: `Switches from Aggressive mode to Passive mode. When in Passive mode, you will wait for ${playername} to attack first.`,
                  schema: {},
                }
                
                stopfollowing = {
                  name: 'stop_following',
                  description: `Allows you to stop following ${playername} and remain in place at your current position.`,
                  schema: {},
                }
                
                resumefollowing = {
                  name: 'resume_following',
                  description: `Allows you to resume following ${playername} after you have stopped following.`,
                  schema: {},
                }
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
                        let minute = Math.floor((decimaltime - hour) * 60);
        
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
                          if (hour === 0) {
                            time = `12:0${minute} ${daytime}`;
                          } else {
                            time = `${hour}:0${minute} ${daytime}`;
                          }
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
                                console.log('[NeuroVegas] Player is currently on the main menu.');
                                neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'switch_to_passive_mode', 'switch_to_aggressive_mode', 'save_game','check_health_status','check_inventory']);
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

              switch_to_passive_mode = {
                name: 'switch_to_passive_mode',
                description: `Switches from Aggressive mode to Passive mode. When in Passive mode, you will wait for ${playername} to attack first.`,
                schema: {},
              }
              
              stopfollowing = {
                name: 'stop_following',
                description: `Allows you to stop following ${playername} and remain in place at your current position.`,
                schema: {},
              }
              
              resumefollowing = {
                name: 'resume_following',
                description: `Allows you to resume following ${playername} after you have stopped following.`,
                schema: {},
              }
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
                  player_was_dead = 1;
                  neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'switch_to_passive_mode', 'switch_to_aggressive_mode', 'save_game','check_health_status','check_inventory']);
                  ResetData();
                  if (playerdeaddata[1] == "0") { 
                    neuroClient.sendContext(`${playername} has died! Please wait for a previous save file to be loaded.`);
                  } else {
                    if (playerdeaddata[1] == "Neuro-Sama" || playerdeaddata[1] == "Evil Neuro") { 
                      neuroClient.sendContext(`You've accidentally killed ${playername}! Please wait for a previous save file to be loaded.`);
                    } else {
                      neuroClient.sendContext(`${playername} was killed by ${playerdeaddata[1]}! Please wait for a previous save file to be loaded.`);
                    }
                    console.log(`[NeuroVegas] Player has died!`);
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

                        switch_to_passive_mode = {
                          name: 'switch_to_passive_mode',
                          description: `Switches from Aggressive mode to Passive mode. When in Passive mode, you will wait for ${playername} to attack first.`,
                          schema: {},
                        }
                        
                        stopfollowing = {
                          name: 'stop_following',
                          description: `Allows you to stop following ${playername} and remain in place at your current position.`,
                          schema: {},
                        }
                        
                        resumefollowing = {
                          name: 'resume_following',
                          description: `Allows you to resume following ${playername} after you have stopped following.`,
                          schema: {},
                        }
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
                          let minute = Math.floor((decimaltime - hour) * 60);
          
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
                            if (hour === 0) {
                              time = `12:0${minute} ${daytime}`;
                            } else {
                              time = `${hour}:0${minute} ${daytime}`;
                            }
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
                                      is_unconscious = 0;
                                      player_was_dead = 1;
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
                    console.log(`[NeuroVegas] Dialogue context sent:\n` + playername+ ": " + dialogueresponse + "\n"+ dialoguespeaker + ": " + dialogue_string);
                    writeDataToFile("0","dialogueresponse.txt");
                    dialogue_string = "";
                  } else {
                    neuroClient.sendContext(dialoguespeaker + ": " + dialogue_string);
                    console.log(`[NeuroVegas] Dialogue context sent:\n` + dialoguespeaker + ": " + dialogue_string);
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
                  let minute = Math.floor((decimaltime - hour) * 60);

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
                            if (hour === 0) {
                              time = `12:0${minute} ${daytime}`;
                            } else {
                              time = `${hour}:0${minute} ${daytime}`;
                            }
                        } else {
                          if (hour === 0) {
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
                      console.log(`[NeuroVegas] Location context sent:\n` + `Current location is now: ${currentlocation} (Outdoors)\nCurrent time is: ${time}`);
                    } else if (indoors == 1) {
                      neuroClient.sendContext(`Current location is now: ${currentlocation} (Indoors)\nCurrent time is: ${time}`,true);
                      console.log(`[NeuroVegas] Location context sent:\n` + `Current location is now: ${currentlocation} (Indoors)\nCurrent time is: ${time}`);
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
                      if (currenthealth > 0) {
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
              }




              unconsciousdata = parseMultiLineString(unconsciousdata);

              if (unconsciousdata.length > 1) {
                if (revivedata == "0") {
                    if (Number(unconsciousdata[0]) == 1 && is_unconscious == 0) {
                      if (unconsciousdata[1] == playername) {
                        neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}! (Friendly Fire)\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                      } else {
                        if (unconsciousdata[1] !== "" && unconsciousdata[1] !== " ") {
                          neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                        } else {
                          neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                        }
                      }
                      console.log(`[NeuroVegas] Neuro has been knocked unconscious!`);
                      is_unconscious = 1;
                      disable_writing = 1;
                      equippable_weapons = "";
                      equippable_aid = "";
                      equippable_ammo = "";
                      ResetDataKnocked();
                      neuroClient.unregisterActions(['equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 'resume_following', 'jump', 'switch_to_passive_mode', 'switch_to_aggressive_mode', 'check_inventory', 'save_game','check_health_status']);
                    }else if (Number(unconsciousdata[0]) == 0 && is_unconscious == 1) {
                      if (player_was_dead == 0) {
                        setTimeout(() => {    
                          neuroClient.sendContext(`You've recovered consciousness!\nHealth is at: ${currenthealth}/${maxhealth}`);
                        }, 250);
                      } else {
                        setTimeout(() => {
                          player_was_dead = 0;
                        }, 1000);
                      }
                      console.log(`[NeuroVegas] Neuro has recovered consciousness! Health is at: ${currenthealth}/${maxhealth}`);
                      neuroClient.registerActions([save_game,checkhealthstatus,checkinventory,jump]);
                      ResetDataKnocked();
                      disable_writing = 0;
                      is_unconscious = 0;
                    }
                } else if (revivedata == "1") {
                  if (Number(unconsciousdata[0]) == 1 && is_unconscious == 0) {
                    if (unconsciousdata[1] === playername) {
                      neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}! (Friendly Fire)\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                    } else {
                      if (unconsciousdata[1] !== "" && unconsciousdata[1] !== " ") {
                        neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious by ${unconsciousdata[1]}!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                      } else {
                        neuroClient.sendContext(`Your health has reached 0 and you were knocked unconscious!\nPlease wait for ${playername} to revive you or until you regain consciousness.`);
                      }
                    }
                    console.log(`[NeuroVegas] Neuro has been knocked unconscious!`);
                    is_unconscious = 1;
                    equippable_weapons = "";
                    equippable_aid = "";
                    equippable_ammo = "";
                    disable_writing = 1;
                    ResetDataKnocked();
                  }else if (Number(unconsciousdata[0]) == 0 && is_unconscious == 1 && currenthealth != 0) {
                      setTimeout(() => {    
                        neuroClient.sendContext(`${playername} has revived you!\nHealth is at: ${currenthealth}/${maxhealth}`);
                      }, 250);
                      console.log(`[NeuroVegas] Neuro has been revived by ${playername}! Health is at: ${currenthealth}/${maxhealth}`);
                      writeDataToFile("0","revived.txt");
                      neuroClient.registerActions([save_game,checkhealthstatus,checkinventory,jump]);
                      ResetDataKnocked();
                      disable_writing = 0;
                      is_unconscious = 0;
                  }
                }
              }

              healdata = parseMultiLineString(healdata);
              if (healdata.length > 1 && is_unconscious == 0) {
                if (healdata[0] == "1") {
                  neuroClient.sendContext(`${playername} healed you for ${healdata[1]} hit points!\nHealth is now at: ${currenthealth}/${maxhealth}`);
                  console.log(`[NeuroVegas] Neuro was healed by ${playername}! Health is now at: ${currenthealth}/${maxhealth}`);
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
                      console.log(`[NeuroVegas] Neuro and ${playername} have leveled up to level ${currentlevel}!`);
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
                              console.log(`[NeuroVegas] Neuro's weapon is out of ammo and was unequipped, an action force to equip a new weapon has been sent!`);
                              weapon_action_force = 1;
                              writeDataToFile("1","weaponforce.txt");
                            }
                          } else {
                            neuroClient.sendContext(`${current_equipped_weapon} is out of ammo and has been unequipped!`);
                            console.log(`[NeuroVegas] Neuro's weapon is out of ammo and was unequipped!`);
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
                          console.log(`[NeuroVegas] Neuro and ${playername} have sat down.`);
                        } else if (Number(sittingdata) == 0 && is_sitting == 1) {
                          is_sitting = 0;
                          neuroClient.sendContext(`You and ${playername} have gotten up from your seats.`);
                          console.log(`[NeuroVegas] Neuro and ${playername} have gotten up from their seats.`);
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
                                  console.log(`[NeuroVegas] Neuro has been forced to resume following.`);
                                  writeDataToFile(String(0),"forcefollow.txt");
                                }
                            } else if (behaviorstate == "1") {
                                neuroClient.unregisterActions(['stop_following','resume_following']);
                                neuroClient.registerActions([resumefollowing]);

                              if (forcefollow == "1") {
                                  neuroClient.sendContext(`${playername} has forced you to stay put and stop following for now.`);
                                  console.log(`[NeuroVegas] Neuro has been forced to stop following and wait.`);
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
          console.log(`[NeuroVegas] Quest context sent:\n` + `QUEST COMPLETED: ${currentquest}`);
          writeDataToFile("0", "queststatus.txt");
          //quest failed 
        } else if (queststatusdata == "2") {
          neuroClient.sendContext(`QUEST FAILED: ${currentquest}`);
          console.log(`[NeuroVegas] Quest context sent:\n` + `QUEST FAILED: ${currentquest}`);
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
                console.log(`[NeuroVegas] Quest context sent:\n` + contextString);
              } else {
                neuroClient.sendContext(`Quest Updated!\nCurrent Quest: ${currentquest}\nQuest Objectives: No current objectives.`,true);
                console.log(`[NeuroVegas] Quest context sent:\n` + `Quest Updated!\nCurrent Quest: ${currentquest}\nQuest Objectives: No current objectives.`);
                questobjectives = [];
              }
            } else {
              if (playerdead == 0 && is_unconscious == 0) {
                neuroClient.sendContext(`No current quests active.`, true);
                console.log(`[NeuroVegas] Quest context sent:\n` + `No current quests active.`);
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
            neuroClient.unregisterActions(['switch_to_passive_mode','switch_to_aggressive_mode']);
            if (current_combatmode == "0") {
                neuroClient.registerActions([switch_to_passive_mode]);
            } else if (current_combatmode == "1") {
              neuroClient.registerActions([switch_to_aggressive_mode]);
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
                            console.log(`[NeuroVegas] Neuro killed ${kill[0]} with her bare fists.`);
                          } else {
                            if (Number(totalammodata) != -1 && Number(totalammodata) != 0) {
                              neuroClient.sendContext(`You killed ${kill[0]} with ${kill[1]}.\nAmmo remaining: ${totalammodata}`);
                              console.log(`[NeuroVegas] Neuro killed ${kill[0]} with ${kill[1]}. Ammo remaining: ${totalammodata}`);
                            } else {
                              neuroClient.sendContext(`You killed ${kill[0]} with ${kill[1]}.`);
                              console.log(`[NeuroVegas] Neuro killed ${kill[0]} with ${kill[1]}.`);
                            }
                          }
                      } else {
                        if (kill[3] == playername) {
                          player_stole_neuros_kill = 1;
                        }
                        neuroClient.sendContext(`${kill[3]} killed ${kill[0]} with ${kill[1]}.`,true);
                        console.log(`[NeuroVegas] ${kill[3]} killed ${kill[0]} with ${kill[1]}.`);
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
                            console.log(`[NeuroVegas] ${playername} killed ${playerkill[0]} with their bare fists.`);   
                          } else {
                            player_stole_neuros_kill = 0;
                          }
                          player_kill_id = playerkill[2];
                        } else {
                          if (player_stole_neuros_kill == 0) {
                            neuroClient.sendContext(`${playername} killed ${playerkill[0]} with ${playerkill[1]}.`,true);
                            console.log(`[NeuroVegas] ${playername} killed ${playerkill[0]} with ${playerkill[1]}.`);
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
                    if (player_was_dead == 0) {
                      setTimeout(() => {
                        neuroClient.sendContext(`No more hostiles detected, combat has ended!\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                        console.log(`[NeuroVegas] Neuro has exited combat! Current Health: ${currenthealth}/${maxhealth}`);
                      }, 1000);
                    } else {
                      setTimeout(() => {
                        player_was_dead = 0;
                      }, 1000);
                    }
                    writeDataToFile("0","nearbyhostiles.txt");
                    is_in_combat = 0;
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
                        console.log(`[NeuroVegas] Neuro has entered combat! Current Weapon: ${current_weapon} Current Health: ${currenthealth}/${maxhealth}`);
                      } else if (nearbyhostiles.length == 1 && nearbyhostiles[0] != "0") {
                        neuroClient.sendContext(`Hostiles detected! Combat has been initiated against ${nearbyhostiles[0]}!\nCurrent Weapon: ${current_weapon}\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                        console.log(`[NeuroVegas] Neuro has entered combat against ${nearbyhostiles[0]}! Current Weapon: ${current_weapon} Current Health: ${currenthealth}/${maxhealth}`);
                      } else if (nearbyhostiles.length > 1) {
                        neuroClient.sendContext(`Hostiles detected! Combat has been initiated!\nNearby Hostiles: ${nearbyhostiles.join(', ')}\nCurrent Weapon: ${current_weapon}\nCurrent Health: ${currenthealth}/${maxhealth}`,true);
                        console.log(`[NeuroVegas] Neuro has entered combat! Nearby Hostiles: ${nearbyhostiles.join(', ')} Current Weapon: ${current_weapon} Current Health: ${currenthealth}/${maxhealth}`);
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
  }
  });
  } else {
    ResetData();
    currentquest = "0";
    questobjs = "0";
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
    if (currentlocation != "Endgame" && currentlocation != "Dead Money Narration" && currentlocation != "Old World Blues Narration" && currentlocation != "Slide Show Theatre Room") {
      if (is_paused == 0) {
        if (gamestate == 1) {
          if (isindialoguedata == "0" || actionData.name === 'check_inventory' || actionData.name === 'check_health_status') {
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
                      setTimeout(() => {
                        neuroClient.sendActionResult(actionData.id, true, `Health is at: ${currenthealth}/${maxhealth}\nAll limbs are healthy!`)
                      }, 200);
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
                      setTimeout(() => {
                        neuroClient.sendActionResult(actionData.id, true, `Health is at: ${currenthealth}/${maxhealth}\n${limbstring}`)
                      }, 200);
                    }
                  });

                  return;
                }  

                //check inventory
                if (actionData.name === 'check_inventory') {
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
                          setTimeout(() => {
                            neuroClient.sendActionResult(actionData.id, true, `Inventory currently contains: ${invstring}`);
                          }, 200);
                        } else {
                          setTimeout(() => {
                            neuroClient.sendActionResult(actionData.id, true, 'Your inventory is currently empty.');
                          }, 200);
                        }
                      });
                    });
                  return;
                }
              //set combat mode to defensive
                if (actionData.name === 'switch_to_passive_mode') {
                  writeDataToFile(String(1) + "\n" + String(1),"combatmode.txt");
                  neuroClient.unregisterActions(['switch_to_passive_mode'])
                  actionresult_data = actionData;
                  waiting_for_action_result = 1;
                  return;
                }  

                //set combat mode to offensive
                if (actionData.name === 'switch_to_aggressive_mode') {
                  writeDataToFile(String(1) + "\n" + String(0),"combatmode.txt");
                  neuroClient.unregisterActions(['switch_to_aggressive_mode'])
                  actionresult_data = actionData;
                  waiting_for_action_result = 1;
                  return;
                }  

                //hold position and stop following the player
                if (actionData.name === 'stop_following') {
                    if (is_sitting == 0){
                      writeDataToFile(String(1) + "\n" + String(1),"follow.txt");
                      neuroClient.unregisterActions(['stop_following'])
                      actionresult_data = actionData;
                      waiting_for_action_result = 1;
                    } else {
                      setTimeout(() => {
                       neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while sitting down.`)
                      }, 200);
                    }
                  return;
                }  

                //resume following the player
                if (actionData.name === 'resume_following') {
                    if (is_sitting == 0){
                      writeDataToFile(String(1) + "\n" + String(0),"follow.txt");
                      neuroClient.unregisterActions(['resume_following'])
                      actionresult_data = actionData;
                      waiting_for_action_result = 1;
                    } else {
                      setTimeout(() => {
                        neuroClient.sendActionResult(actionData.id, false, `You cannot use this action while sitting down.`);
                      }, 200);
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
                          writeDataToFile(String(1) + "\n" + selectedwep,"weapon_to_equip.txt");
                          waiting_for_action_result = 1;
                          actionresult_data = actionData;
                          weapon_to_equip = selectedwep;
                        } else {
                          setTimeout(() => {
                            neuroClient.sendActionResult(actionData.id, false,  selectedwep + ' is not a valid weapon!');
                          }, 200);
                        }
                      } else {
                        neuroClient.unregisterActions(['equip_weapon']);
                        setTimeout(() => {
                          neuroClient.sendActionResult(actionData.id, false,  'There are no weapons in your inventory to equip!');
                        }, 200);
                      }
                    });

                  weapon_action_force = 0;
                  writeDataToFile("0","weaponforce.txt");
                  return;
                }

                //unequip the currently equipped weapon
                if (actionData.name === 'unequip_weapon') {
                    readFile(currentweaponFilePath, 'utf-8', (err, weapondata) => {
                      if (err) {
                          console.error(`[NeuroVegas] Error Reading File: ${err.message}`);
                          return;
                      }
                      if (weapondata !== "0") {
                        writeDataToFile(String(1) + "\n" + String(-2),"weapon_to_equip.txt");
                        neuroClient.unregisterActions(['unequip_weapon']);
                        waiting_for_action_result = 1;
                        actionresult_data = actionData;
                      } else {
                        neuroClient.unregisterActions(['unequip_weapon']);
                        setTimeout(() => {
                          neuroClient.sendActionResult(actionData.id, false,  'You have no weapon to unequip!');
                        }, 200);
                      }
                    });
                  return;
                }  

                //initiates the aid consumption process
                if (actionData.name === 'use_consumable') {
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
                          writeDataToFile(String(1) + "\n" + selectedaid,"aid_to_use.txt");
                          waiting_for_action_result = 1;
                          actionresult_data = actionData;
                          consumable_to_use = selectedaid;
                        } else {
                          setTimeout(() => {
                            neuroClient.sendActionResult(actionData.id, false, selectedaid + ' is not a valid consumable!');
                          }, 200);
                        }
                      } else {
                        neuroClient.unregisterActions(['use_consumable']);
                        setTimeout(() => {
                          neuroClient.sendActionResult(actionData.id, false,  'There are no consumable items in your inventory to use!');
                        }, 200);
                      }
                    });
                  return;
                }

                //initiates the ammo switching process
                if (actionData.name === 'switch_ammo') {
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
                          writeDataToFile(String(1) + "\n" + selectedammo,"ammo_to_equip.txt");
                          neuroClient.unregisterActions(['switch_ammo']);
                          waiting_for_action_result = 1;
                          actionresult_data = actionData;
                          ammo_to_equip = selectedammo;
                        } else {
                          setTimeout(() => {
                            neuroClient.sendActionResult(actionData.id, false, selectedammo + ' is not a valid ammo type!');
                          }, 200);
                        }
                      } else {
                        neuroClient.unregisterActions(['switch_ammo']);
                        setTimeout(() => {
                          neuroClient.sendActionResult(actionData.id, false, 'There are no alternate ammo types in your inventory to switch to!');
                        }, 200);
                      }
                    });
                  return;
                }

                //makes neuro jump in-game
                if (actionData.name === 'jump') {
                  if (is_sitting == 0) {
                    writeDataToFile(String(1),"jump.txt");
                    actionresult_data = actionData;
                    waiting_for_action_result = 1;
                  } else {
                    setTimeout(() => {
                      neuroClient.sendActionResult(actionData.id, false, "You cannot jump while sitting down.");
                    }, 200);
                  }
                  return;
                }  

                if (actionData.name === 'save_game') {
                  if (is_in_combat == 0) {
                    writeDataToFile(String(1),"savegame.txt");
                    actionresult_data = actionData;
                    waiting_for_action_result = 1;
                  } else {
                    setTimeout(() => {
                      neuroClient.sendActionResult(actionData.id, false, "You cannot save while in combat!");
                    }, 200);
                  }
                  return;
                }

              } else {
                if (weapon_action_force == 1) {
                  setTimeout(() => {
                    neuroClient.sendActionResult(actionData.id, true, `Error! You cannot perform actions while ${playername} is dead! Please wait for a previous save to be loaded.`)
                  }, 200);
                  weapon_action_force = 0;
                  writeDataToFile("0","weaponforce.txt");
                } else if(weapon_action_force == 0) {
                  setTimeout(() => {
                    neuroClient.sendActionResult(actionData.id, false, `You cannot perform actions while ${playername} is dead! Please wait for a previous save to be loaded.`)
                  });
                }
                return;
              }
            } else {
              if (weapon_action_force == 1) {
                setTimeout(() => {
                  neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions while unconscious.')
                }, 200);
                writeDataToFile("0","weaponforce.txt");
              } else if(weapon_action_force == 0) {
                setTimeout(() => {
                  neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions while unconscious.')
                }, 200);
              }
              return;
            }
          } else {
            if (weapon_action_force == 1) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, true, `Error! You cannot perform this action while ${playername} is in a conversation.`)
              }, 200);
              weapon_action_force = 0;
              writeDataToFile("0","weaponforce.txt");
            } else if(weapon_action_force == 0) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, false, `You cannot perform this action while ${playername} is in a conversation.`)
              }, 200);
            }
            return;
          }
        } else {
          if (weapon_action_force == 0) {
            if (gamestate == 0) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions while on the main menu. Please wait for the game to start.')
              }, 200);
            } else if (gamestate == 2) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions during a loading screen.')
              }, 200);
            } else if (gamestate == -1) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, false, "You cannot perform actions while the game isn't running.")
              }, 200);
            }
          } else if (weapon_action_force == 1) {
            if (gamestate == 0) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions while on the main menu. Please wait for the game to start.')
              }, 200);
            } else if (gamestate == 2) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions during a loading screen.')
              }, 200);
            } else if (gamestate == -1) {
              setTimeout(() => {
                neuroClient.sendActionResult(actionData.id, true, "Error! You cannot perform actions while the game isn't running.")
              }, 200);
            }
            weapon_action_force = 0;
            writeDataToFile("0","weaponforce.txt");
          }
          return;
        }
      } else {
        if (weapon_action_force == 0) {
          setTimeout(() => {
            neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions while the game is paused! Please wait for the game to resume.')
          }, 200);
        } else if (weapon_action_force == 1) {
          setTimeout(() => {
            neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions while the game is paused! Please wait for the game to resume.')
          }, 200);
          weapon_action_force = 0;
          writeDataToFile("0","weaponforce.txt");
        }
        return;
      }
    } else {
      if (weapon_action_force == 0) {
        setTimeout(() => {
          neuroClient.sendActionResult(actionData.id, false, 'You cannot perform actions during a cutscene!')
        }, 200);
      } else if (weapon_action_force == 1) {
        setTimeout(() => {
          neuroClient.sendActionResult(actionData.id, true, 'Error! You cannot perform actions during a cutscene!')
        }, 200);
        weapon_action_force = 0;
        writeDataToFile("0","weaponforce.txt");
      }
      return;
    }
    setTimeout(() => {
      neuroClient.sendActionResult(actionData.id, false, 'Unknown action.')
    }, 200);
    });
});
})

function onProgramExit() {
  neuroClient.unregisterActions([
    'equip_weapon', 'unequip_weapon', 'choose_weapon_to_equip', 'use_consumable', 'choose_consumable_to_use', 
    'switch_ammo', 'choose_ammo_to_switch', 'disengage_combat', 're-engage_combat', 'stop_following', 
    'resume_following', 'jump', 'switch_to_passive_mode', 'switch_to_aggressive_mode', 
    'check_inventory', 'save_game', 'check_health_status', 'check_inventory'
  ]);
}

process.on('exit', onProgramExit);