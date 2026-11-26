export type CastleDistrict = 1 | 2 | 3 | 4;
export type BlueprintCategory = 'monument' | 'fortification' | 'decoration' | 'companion';

export interface BlueprintPart {
  readonly id: string;
  readonly label: string;
  readonly district: CastleDistrict;
  readonly category: BlueprintCategory;
  readonly slot: number;
  readonly lore: string;
  readonly modelKey: string;
  readonly goalUnits: number;
}

export const CASTLE_DISTRICTS = Object.freeze([
  Object.freeze({ number: 1, label: 'Outer Bailey & Moat' }),
  Object.freeze({ number: 2, label: 'Courtyard & Citadel' }),
  Object.freeze({ number: 3, label: 'High Bastions & Armory' }),
  Object.freeze({ number: 4, label: 'Royal Sanctuary & Spires' }),
] as const);

function district(number: CastleDistrict, rows: readonly (readonly [
  id: number, slot: number, category: BlueprintCategory, modelKey: string,
  label: string, goalUnits: number, lore: string,
])[]): BlueprintPart[] {
  return rows.map(([id, slot, category, modelKey, label, goalUnits, lore]) => Object.freeze({
    id: 'blueprint-v2-' + String(id).padStart(3, '0'),
    district: number, slot, category, modelKey, label, goalUnits, lore,
  }));
}

// The first number in each record is its permanent v2 purchase ID, independent of display order.
// Provisional prices reflect each addition's scale and craftsmanship: small fittings
// cost less than major structures. The full catalog remains 365 starting daily goals.
// Purchased assets retain their recorded priceCents; these rates affect new purchases only.
export const BLUEPRINT_PARTS: readonly BlueprintPart[] = Object.freeze([
  ...district(1, [
    [1, 0, 'fortification', 'bailey-foundation', 'Bailey Foundation', 1, 'The first courses of stone mark the limits of the outer stronghold.'],
    [2, 1, 'fortification', 'moat-excavation', 'Deep Moat Excavation', 4, 'Rainwater gathers in the deep ditch encircling the hill.'],
    [3, 2, 'fortification', 'moat-piers', 'Stone Moat Piers', 3, 'Squared piers carry the bridge above the flood line.'],
    [4, 3, 'fortification', 'retaining-walls', 'Moat Retaining Walls', 3, 'Battered walls hold the steep banks in place through spring floods.'],
    [5, 4, 'fortification', 'heavy-drawbridge', 'Heavy Timber Drawbridge', 5, 'Iron chains lift the oak deck against the gate at night.'],
    [6, 5, 'fortification', 'outer-barbican', 'Outer Gatehouse Barbican', 6, 'Visitors pass under the watch of two flanking guardrooms.'],
    [7, 6, 'fortification', 'portcullis', 'Iron Portcullis', 4, 'A counterweighted iron grille closes the gate passage.'],
    [8, 7, 'fortification', 'west-masonry', 'West Masonry', 3, 'West-bank masons cut each block to fit the slope of the hill.'],
    [9, 8, 'fortification', 'center-masonry', 'Central Masonry', 3, 'Deep stone courses bear the weight of the main approach.'],
    [10, 9, 'fortification', 'east-masonry', 'East Masonry', 3, 'Pale limestone catches the first light above the moat.'],
    [11, 10, 'fortification', 'west-curtain', 'West Curtain Rampart', 4, 'A sheltered walkway follows the western ditch.'],
    [12, 11, 'fortification', 'east-curtain', 'East Curtain Rampart', 4, 'The eastern rampart overlooks the road to the citadel.'],
    [13, 12, 'fortification', 'north-curtain', 'North Curtain Rampart', 4, 'Extra-thick stone braces the rampart against winter winds.'],
    [14, 13, 'fortification', 'south-curtain', 'South Curtain Rampart', 4, 'The southern patrol route meets the gatehouse stairs.'],
    [15, 14, 'decoration', 'iron-torch-braziers', 'Iron Torch Braziers', 1, 'Open iron baskets light the drawbridge on cloudy nights.'],
    [16, 15, 'fortification', 'stone-sentry-posts', 'Stone Sentry Posts', 2, 'Recessed shelters keep the watch dry on the outer wall.'],
    [17, 16, 'fortification', 'moat-sluice', 'Moat Drainage Sluice', 2, 'A timber gate releases excess water into the lower channel.'],
    [18, 17, 'fortification', 'chain-hoist', 'Drawbridge Chain Hoist', 2, 'A geared winch reels in the heavy bridge chains.'],
    [19, 18, 'fortification', 'bailey-postern', 'Bailey Postern Door', 1, 'A narrow oak door gives patrols a quiet way onto the bank.'],
    [20, 19, 'fortification', 'archer-gallery', 'Outer Archer Gallery', 3, 'A roofed gallery shelters archers along the outer approach.'],
    [21, 20, 'fortification', 'golden-walls', 'Golden Gate Walls', 5, 'Gold coping marks the two walls guarding the main gate.'],
    [22, 21, 'fortification', 'watch-stair', 'Bailey Watch Stair', 2, 'A steep stair joins the lower court to the wall walk.'],
    [23, 22, 'fortification', 'parapet-capstones', 'Parapet Capstones', 1, 'Rounded capstones shed rain away from the mortar.'],
    [24, 23, 'decoration', 'gatehouse-bell', 'Gatehouse Watch Bell', 1, 'The bell sounds once when the last evening patrol returns.'],
    [25, 24, 'decoration', 'moat-markers', 'Moat Depth Markers', 1, 'Carved stone marks the high-water levels from past storms.'],
    [26, 25, 'decoration', 'gatehouse-lanterns', 'Gatehouse Lanterns', 1, 'Glazed lanterns keep a steady light under the entry arch.'],
    [27, 26, 'fortification', 'bridge-abutment', 'Bridge Abutment', 3, 'A deep masonry footing carries the landward end of the bridge.'],
    [28, 27, 'fortification', 'bank-revetment', 'Riverbank Revetment', 2, 'Interlocking stones protect the outer bank from erosion.'],
    [29, 28, 'decoration', 'bailey-standard', 'Bailey Standard', 1, 'A weatherproof standard flies above the moat crossing.'],
    [30, 29, 'companion', 'mastiff', 'Gatehouse Mastiff', 3, 'The brindled mastiff keeps watch by the drawbridge in a fitted coat of armor.'],
  ]),
  ...district(2, [
    [31, 0, 'monument', 'banqueting-hall', 'Great Banqueting Hall', 7, 'The great timber hall hosts winter feasts beneath a steep gabled roof.'],
    [32, 1, 'monument', 'arched-stables', 'Stone Arched Stables', 5, 'Wide stone arches open each stall to the sheltered yard.'],
    [33, 2, 'monument', 'stable-hayloft', 'Stable Hayloft', 2, 'A high timber loft keeps the winter fodder above the damp.'],
    [34, 3, 'monument', 'blacksmith-forge', 'Blacksmith Armory Forge', 5, 'The smith draws ironwork from the forge under a tall chimney.'],
    [35, 4, 'monument', 'knights-barracks', "Knights’ Barracks Wing", 5, 'A long wing houses the knights near the training yard.'],
    [36, 5, 'fortification', 'inner-wall-ring', 'Inner Wall Ring', 4, 'Low crenellated walls define the inner court.'],
    [37, 6, 'monument', 'cobblestone-plaza', 'Cobblestone Plaza', 4, 'Cobbles fan out from the fountain to each courtyard doorway.'],
    [38, 7, 'decoration', 'tiered-fountain', 'Royal Tiered Water Fountain', 3, 'Water spills over three carved bowls before returning to the basin.'],
    [39, 8, 'decoration', 'heraldic-shields', 'Heraldic Wall Shields', 1, 'Painted shields commemorate households that built the citadel.'],
    [40, 9, 'decoration', 'wall-crests', 'Carved Wall Crests', 1, 'Stonecutters set the royal crest into the court walls.'],
    [41, 10, 'decoration', 'herb-gardens', 'Courtyard Herb Gardens', 1, 'Rosemary and sage grow beside the kitchen door.'],
    [42, 11, 'decoration', 'stone-planters', 'Courtyard Stone Planters', 1, 'Low carved containers hold the hardiest courtyard plants.'],
    [43, 12, 'monument', 'kitchen-wing', 'Hall Kitchen Wing', 4, 'Bread ovens and great hearths warm the service wing.'],
    [44, 13, 'monument', 'covered-market', 'Covered Courtyard Market', 3, 'Timber stalls shelter the weekly market from sudden rain.'],
    [45, 14, 'monument', 'cistern-house', 'Courtyard Cistern House', 3, 'A small stone house guards the court’s reserve of fresh water.'],
    [46, 15, 'monument', 'brew-house', 'Brewhouse', 3, 'The brewers keep their casks in a cool room behind the hall.'],
    [47, 16, 'monument', 'training-yard', 'Knights’ Training Yard', 3, 'Timber targets stand beside a wide strip of packed earth.'],
    [48, 17, 'monument', 'citadel-arcade', 'Citadel Arcade', 3, 'A line of rounded arches links the hall and barracks.'],
    [49, 18, 'decoration', 'smith-anvil', 'Forge Anvil', 1, 'The iron anvil rests on an oak block worn by years of work.'],
    [50, 19, 'decoration', 'horse-trough', 'Stable Water Trough', 1, 'A low stone trough catches water from the stable roof.'],
    [51, 20, 'decoration', 'courtyard-benches', 'Courtyard Benches', 1, 'Long stone seats line the sunny side of the plaza.'],
    [52, 21, 'decoration', 'hall-lanterns', 'Banqueting Hall Lanterns', 1, 'Pierced brass casts a warm pattern across the paving.'],
    [53, 22, 'decoration', 'cloister-columns', 'Cloister Columns', 2, 'Paired columns frame a quiet path around the herb garden.'],
    [54, 23, 'fortification', 'citadel-gate', 'Citadel Gate', 4, 'Twin oak doors close off the inner court after dark.'],
    [55, 24, 'fortification', 'inner-watch', 'Inner Watch Lodge', 2, 'The gate guard keeps a roster in this small stone lodge.'],
    [56, 25, 'decoration', 'plaza-mosaic', 'Plaza Compass Mosaic', 2, 'A colored compass set into the plaza points to the four gates.'],
    [57, 26, 'monument', 'granary', 'Citadel Granary', 4, 'The raised floor keeps grain dry through the wet season.'],
    [58, 27, 'decoration', 'garden-trellis', 'Kitchen Garden Trellis', 1, 'A vaulted timber trellis shades the garden’s south path.'],
    [59, 28, 'companion', 'cat', 'Courtyard Calico Cat', 2, 'The calico seeks the warmest wall once the watch changes.'],
    [60, 29, 'companion', 'stallion', 'Royal Stallion', 4, 'The dark-coated warhorse rests beside the arched stables.'],
  ]),
  ...district(3, [
    [61, 0, 'fortification', 'north-bastion', 'North Round Bastion', 5, 'The round northern tower commands the high ridge.'],
    [62, 1, 'fortification', 'south-bastion', 'South Round Bastion', 5, 'The southern twin overlooks the road and lower bailey.'],
    [63, 2, 'fortification', 'machicolated-parapets', 'Machicolated Battlement Parapets', 4, 'Projecting stone brackets carry the upper battlement walk.'],
    [64, 3, 'monument', 'treasury-vault', 'Royal Treasury Vault', 4, 'A thick barrel vault shelters the castle treasury.'],
    [65, 4, 'monument', 'falconry-aerie', 'High Falconry Aerie', 4, 'An open loft gives the falcon a clear view over the ridge.'],
    [66, 5, 'fortification', 'falconry-turret', 'Falconry Turret', 4, 'A narrow turret rises above the falconer’s stairs.'],
    [67, 6, 'decoration', 'stone-gargoyles', 'Carved Stone Gargoyles', 2, 'Grim stone faces channel rainwater clear of the corners.'],
    [68, 7, 'decoration', 'silk-pennants', 'Silk Heraldic Pennants', 1, 'Bright silk pennants show the wind above the parapet.'],
    [69, 8, 'decoration', 'wall-banners', 'Long Wall Banners', 1, 'Heavy banners hang from crossbars above the bastion stairs.'],
    [70, 9, 'decoration', 'weapon-displays', 'Armory Weapon Displays', 2, 'Ceremonial weapons rest on carved frames inside the armory.'],
    [71, 10, 'decoration', 'armory-sconces', 'Armory Wall Sconces', 1, 'Iron sconces light the narrow paths between armory doors.'],
    [72, 11, 'fortification', 'west-casemate', 'West Casemate', 4, 'A vaulted guard chamber is built into the thick western wall.'],
    [73, 12, 'fortification', 'east-casemate', 'East Casemate', 4, 'The eastern chamber overlooks the steep approach to the ridge.'],
    [74, 13, 'fortification', 'bastion-bridge', 'Bastion Footbridge', 4, 'A narrow elevated span links the upper bastion walks.'],
    [75, 14, 'monument', 'armory-hall', 'Bastion Armory Hall', 4, 'The long hall shelters stores for the garrison.'],
    [76, 15, 'fortification', 'shielded-lookout', 'Shielded Lookout', 3, 'A covered platform protects the watch from ridge winds.'],
    [77, 16, 'fortification', 'signal-tower', 'High Signal Tower', 5, 'The tower’s bronze lantern signals to patrols in the valley.'],
    [78, 17, 'fortification', 'bastion-stair', 'Upper Bastion Stair', 3, 'Broad stone steps climb from the armory to the parapet.'],
    [79, 18, 'fortification', 'treasury-doors', 'Treasury Iron Doors', 4, 'Two interlocking doors secure the vault’s inner passage.'],
    [80, 19, 'decoration', 'bastion-beacon', 'Bastion Beacon', 2, 'A hooded fire basket shines through fog on the ridge.'],
    [81, 20, 'decoration', 'falcon-perches', 'Falconry Perches', 1, 'Leather wraps the wooden perches where the falcon rests.'],
    [82, 21, 'decoration', 'armory-crates', 'Garrison Supply Chests', 1, 'Iron-bound chests hold spare fittings for the upper walls.'],
    [83, 22, 'decoration', 'treasury-seal', 'Treasury Seal', 1, 'A brass seal is set above the vaulted treasury entrance.'],
    [84, 23, 'fortification', 'arched-viaduct', 'High Arched Viaduct', 5, 'Stone arches carry the garrison road across the ravine.'],
    [85, 24, 'fortification', 'bastion-merlons', 'Bastion Merlons', 2, 'Squared merlons crown the stone parapet on the ridge.'],
    [86, 25, 'fortification', 'ridge-buttresses', 'Ridge Buttresses', 4, 'These broad supports brace the high wall against the hillside.'],
    [87, 26, 'decoration', 'bastion-weathercock', 'Bastion Weathercock', 1, 'A copper vane turns above the watch roof.'],
    [88, 27, 'decoration', 'parapet-bells', 'Parapet Warning Bells', 1, 'A row of small bells is audible from each bastion.'],
    [89, 28, 'monument', 'quartermaster-lodge', 'Quartermaster’s Lodge', 3, 'The quartermaster keeps the garrison accounts in a lodge beside the armory.'],
    [90, 29, 'companion', 'falcon', 'Tower Peregrine Falcon', 4, 'The peregrine watches the valley from the high parapet.'],
  ]),
  ...district(4, [
    [91, 0, 'monument', 'throne-keep', 'High Throne Keep', 7, 'The royal keep rises behind the citadel on the highest ground.'],
    [92, 1, 'monument', 'royal-sanctuary', 'Royal Sanctuary', 6, 'Tall windows light the quiet rooms adjoining the throne hall.'],
    [93, 2, 'monument', 'cathedral-spire', 'Cathedral Spire', 6, 'The slate spire rises above the vaulted cathedral crossing.'],
    [94, 3, 'fortification', 'flying-buttresses', 'Cathedral Flying Buttresses', 4, 'Open stone arches carry the cathedral roof’s weight to outlying piers.'],
    [95, 4, 'monument', 'astral-clock-tower', 'Grand Astral Clock Tower', 6, 'The gilded clock face traces the moon as well as the hours.'],
    [96, 5, 'monument', 'sun-observatory', 'Celestial Sun Observatory', 6, 'The observatory’s domed roof shelters instruments aligned with the solstice.'],
    [97, 6, 'decoration', 'rose-windows', 'Stained Glass Rose Windows', 3, 'Colored glass forms a rosette over the sanctuary doors.'],
    [98, 7, 'decoration', 'gilded-railings', 'Gilded Balcony Railings', 2, 'Fine golden balusters edge the royal balcony.'],
    [99, 8, 'decoration', 'royal-braziers', 'Gilded Balcony Braziers', 1, 'Brass bowls warm the terrace after sundown.'],
    [100, 9, 'decoration', 'armillary-sphere', 'Celestial Astronomical Armillary Sphere', 4, 'Nested bronze rings model the motions of the heavens.'],
    [101, 10, 'monument', 'throne-hall', 'Imperial Throne Hall', 6, 'Rows of carved pillars frame the throne beneath a ribbed vault.'],
    [102, 11, 'monument', 'royal-library', 'Royal Library', 5, 'The library preserves maps and field journals from the surrounding kingdom.'],
    [103, 12, 'monument', 'choir-chapel', 'Royal Choir Chapel', 3, 'The small chapel holds the carved stalls of the royal choir.'],
    [104, 13, 'monument', 'star-gallery', 'Star Chart Gallery', 3, 'A high gallery displays the observatory’s painted sky charts.'],
    [105, 14, 'monument', 'west-spire', 'West Sanctuary Spire', 3, 'A narrow western spire marks the stair up to the roof.'],
    [106, 15, 'monument', 'east-spire', 'East Sanctuary Spire', 3, 'The eastern spire’s copper finial catches the dawn.'],
    [107, 16, 'fortification', 'royal-skybridge', 'Royal Skybridge', 4, 'An enclosed stone span connects the royal wings.'],
    [108, 17, 'monument', 'gilded-loggia', 'Gilded Loggia', 3, 'An open columned room looks out over the entire bailey.'],
    [109, 18, 'decoration', 'sanctuary-statues', 'Sanctuary Statues', 2, 'Stone figures stand in niches beside the chapel entry.'],
    [110, 19, 'fortification', 'summit-parapet', 'Summit Parapet', 3, 'A low parapet follows the edge of the highest terrace.'],
    [111, 20, 'decoration', 'clock-bells', 'Astral Clock Bells', 2, 'Three bronze bells sound in order as the clock strikes.'],
    [112, 21, 'decoration', 'observatory-transit', 'Observatory Transit', 2, 'A brass sighting instrument records stars crossing the meridian.'],
    [113, 22, 'decoration', 'royal-coat-of-arms', 'Royal Coat of Arms', 2, 'A gilded crest crowns the passage between the royal wings.'],
    [114, 23, 'decoration', 'moon-dial', 'Sanctuary Moon Dial', 2, 'A silver pointer crosses the dial in the light of a full moon.'],
    [115, 24, 'decoration', 'spire-finials', 'Gilded Spire Finials', 1, 'Worked gold caps the smallest rooftop pinnacles.'],
    [116, 25, 'monument', 'royal-oratory', 'Royal Oratory', 3, 'A narrow vaulted chamber opens onto the sanctuary terrace.'],
    [117, 26, 'decoration', 'imperial-standard', 'Imperial Standard', 1, 'The royal banner flies above the highest inhabited hall.'],
    [118, 27, 'decoration', 'spire-grotesques', 'Spire Grotesques', 2, 'Stone beasts peer down from the cathedral’s upper corners.'],
    [119, 28, 'companion', 'wyvern', 'Stone Wyvern Guardian', 6, 'The stone wyvern breathes blue embers from a high perch.'],
    [120, 29, 'monument', 'imperial-crown', 'Golden Imperial Crown Pinnacle', 10, 'A gilded crown surmounts the tallest pinnacle above the royal sanctuary.'],
  ]),
]);
