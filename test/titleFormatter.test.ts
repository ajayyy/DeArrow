import { TitleFormatting } from "../src/config/config";
import { capitalizeFirstLetter, cleanPunctuation, formatTitleInternal, isAcronym, isAcronymStrict, isInTitleCase, isMostlyAllCaps, toCapitalizeCase, toSentenceCase, toTitleCase } from "../src/titles/titleFormatter";

describe("Acronym Tests", () => {
    const acronymCases: [string, boolean][] = [
        ["USA", true],
        ["U.S.A.", true],
        ["U.S.A.G", true],
        ["U.S.A.G.", true],
        ["SOMETHING", false],
    ];
    for (const testCase of acronymCases) {
        const [input, result] = testCase;
        it(input, () => {
            expect(isAcronym(input)).toBe(result);
        });
    }
});

describe("Strict Acronym Tests", () => {
    const strictAcronymCases: [string, boolean][] = [
        ["U.S.", true],
        ["US", false],
    ];
    for (const testCase of strictAcronymCases) {
        const [input, result] = testCase;
        it(input, () => {
            expect(isAcronymStrict(input)).toBe(result);
        });
    }
});

describe("Capitalize First Letter Tests", () => {
    const capitalizeFirstCases: [string, string][] = [
        ["word", "Word"],
        ["WORD", "Word"],
        ["[word]", "[Word]"],
        ["[WORD]", "[Word]"],
        ["[[-w", "[[-W"],
        ["[[-W", "[[-W"],
        ["2020", "2020"],
        ["𝐕𝐞𝐝𝐚𝐥", "𝐕𝐞𝐝𝐚𝐥"],
        ["🛑WORD", "🛑Word"],
        ["🛑word🛑word", "🛑Word🛑word"],
    ];
    for (const testCase of capitalizeFirstCases) {
        const [input, expected] = testCase;
        it(input, () => {
            expect(capitalizeFirstLetter(input)).toBe(expected);
        });
    }
});

describe("isMostlyAllCaps", () => {
    const mostlyAllCapsCases: [string[], boolean][] = [
        [["SOME", "WORDS", "are", "ALL", "CAPS"], true],
        [["SOME", "Words", "are", "All", "CAPS."], false],
    ];
    for (const testCase of mostlyAllCapsCases) {
        const [input, expected] = testCase;
        it(input.join(", "), () => {
            expect(isMostlyAllCaps(input)).toBe(expected);
        });
    }
});

describe("isInTitleCase", () => {
    const inTitleCaseCases: [string[], boolean][] = [
        [["Go", "on", "the", "Table", "with", "a", "Cat"], true],
        [["Go", "on", "the", "table", "with", "a", "cat"], false],
    ];
    for (const testCase of inTitleCaseCases) {
        const [input, expected] = testCase;
        it(input.join(", "), () => {
            expect(isInTitleCase(input)).toBe(expected);
        });
    }
});

describe("toCapitalizeCase", () => {
    const capitalizeCases: [string, string][] = [
        ["Go on the table with a cat", "Go On The Table With A Cat"],
        ["Go on the Table with a Cat", "Go On The Table With A Cat"],
    ];
    for (const testCase of capitalizeCases) {
        const [input, expected] = testCase;
        it(input, async () => {
            expect(await toCapitalizeCase(input, false)).toBe(expected);
        });
    }
});

describe("toTitleCase", () => {
    const titleCases: [string, string][] = [
        ["Go on the table with a cat", "Go on the Table with a Cat"],
        ["Go On The Table With A Cat", "Go on the Table with a Cat"],
        ["5 Minute Timer [MOUSE MAZE] 🐭", "5 Minute Timer [Mouse Maze] 🐭"],
        ["AWESOME ART TRICKS and EASY DRAWING HACKS", "Awesome Art Tricks and Easy Drawing Hacks"],
        ["5 min countdown timer (roller coaster) 🎢", "5 Min Countdown Timer (Roller Coaster) 🎢"],
        ["5 min COUNTDOWN timer from U.S.A (roller coaster) 🎢", "5 Min Countdown Timer from U.S.A (Roller Coaster) 🎢"],
        ["Going somewhere [U.S.A is the place]", "Going Somewhere [U.S.A Is the Place]"],
        ["The car is from the U.S.A", "The Car Is from the U.S.A"],
        ["When I WENT TO The Store", "When I Went to the Store"],
        ["Something happened in the 2000s", "Something Happened in the 2000s"],
        ["USB-C AirPods Pro Kit - Assembly Guide", "USB-C AirPods Pro Kit - Assembly Guide"],
        ["Why Does OTT Sound So Good?", "Why Does OTT Sound so Good?"],
        ["You Don't Understand EQ - PART 1", "You Don't Understand EQ - Part 1"],
        ["First title: The Second title", "First Title: The Second Title"],
        ['Ski Aggu über Crazy Frog, "Party Sahne", Southstar & Domiziana – Interview mit Aria Nejati', 'Ski Aggu Über Crazy Frog, "Party Sahne", Southstar & Domiziana – Interview Mit Aria Nejati'],
        ["visionOS Success ISN'T Up to 3rd Party Devs", "visionOS Success Isn't Up to 3rd Party Devs"],
        ["So, visionOS Success ISN'T Up to 3rd Party Devs", "So, visionOS Success Isn't Up to 3rd Party Devs"],
        ["Lego 10321: Corvette - HANDS-ON review", "Lego 10321: Corvette - Hands-on Review"],
        ["The World’s Largest Metro System! | Shanghai Metro Explained", "The World’s Largest Metro System | Shanghai Metro Explained"],
        ["The World’s Largest Metro System! Shanghai Metro Explained", "The World’s Largest Metro System. Shanghai Metro Explained"],
        ["The World’s Largest Metro System!", "The World’s Largest Metro System"],
        ["Did you know that osu! is a game?", "Did You Know That osu! Is a Game?"],
        ["Did you know that NASA is real?", "Did You Know That NASA Is Real?"],
        ["Wow, NASA! Did you know that NASA is real?", "Wow, NASA. Did You Know That NASA Is Real?"],
        ["[9.98⭐] Merami | xi - Ascension to Heaven [Death] 1st +HDDTHR FC 85.25% {1123pp FC} - osu!", "[9.98⭐] Merami | Xi - Ascension to Heaven [Death] 1st +HDDTHR FC 85.25% {1123pp FC} - osu!"],
        ["Did you SEE that?", "Did You See That?"],
        ["1980's Gadget Censors Bad Words", "1980's Gadget Censors Bad Words"],
        ["Magic iPad", "Magic iPad"],
        ["Review of this thing called an iPad", "Review of This Thing Called an iPad"],
        ["Review of some product (1980s)", "Review of Some Product (1980s)"],
        ["The Collatz Conjecture... but in Binary", "The Collatz Conjecture... But in Binary"],
        ["The Collatz Conjecture.!! but in Binary", "The Collatz Conjecture. But in Binary"],
    ];
    for (const testCase of titleCases) {
        const [input, expected] = testCase;
        it(input, async () => {
            expect(await toTitleCase(input, false)).toBe(expected);
        });
    }
});

describe("toTitleCase cleanEmojis", () => {
    const titleCases: [string, string][] = [
        ["5 Minute Timer [MOUSE 🐭 MAZE] 🐭", "5 Minute Timer [Mouse Maze]"],
        ["5 min countdown timer (roller coaster) 🎢", "5 Min Countdown Timer (Roller Coaster)"],
        ["5 min countdown timer (roller🎢coaster) 🎢", "5 Min Countdown Timer (Roller Coaster)"],
        ["5 min countdown timer (roller🎢🎢🎢coaster) 🎢", "5 Min Countdown Timer (Roller Coaster)"],
        ["5 min countdown timer (roller🎢🛠️🎢coaster) 🎢", "5 Min Countdown Timer (Roller Coaster)"],
        [" 🎢  🎢🎢 🎢🎢\t🎢", "🎢 🎢🎢 🎢🎢\t🎢"], // Leave emojis when there is no text
        ["Rush 🅱️", "Rush 🅱️"],
        ["5 min countdown timer (roller🎢🅱️oaster) 🎢", "5 Min Countdown Timer (Roller 🅱️oaster)"],
        ["5 min countdown 🎢🅱️🎢🎢 timer (roller coaster) 🎢", "5 Min Countdown 🅱️ Timer (Roller Coaster)"],
        ["🎢🅱️🎢🎢 5 min countdown timer (roller coaster) 🎢", "🅱️ 5 Min Countdown Timer (Roller Coaster)"],
        ["🛠️ How You Can Repair Your Things", "How You Can Repair Your Things"],
        ["🏳️‍🌈🏳️‍🌈🏳️‍🌈 5 min countdown timer🏳️‍🌈 🏳️‍🌈🏳️‍🌈🏳️‍🌈 (roller🏳️‍🌈🏳️‍🌈🏳️‍🌈coaster) 🏳️‍🌈", "5 Min Countdown Timer (Roller Coaster)"],
        ["5 min countdown 👷🏾‍♀️👷🏾‍♀️👷🏾‍♀️ timer (roller👷🏾‍♀️👷🏾‍♀️👷🏾‍♀️coaster) 👷🏾‍♀️", "5 Min Countdown Timer (Roller Coaster)"],
        ["5 min countdown 👩🏽‍👨🏽‍👦🏽‍👦🏽 timer (roller👩🏽‍👨🏽‍👦🏽‍👦🏽👩🏽‍👨🏽‍👦🏽‍👦🏽coaster) 👩🏽‍👨🏽‍👦🏽‍👦🏽👩🏽‍👨🏽‍👦🏽‍👦🏽", "5 Min Countdown Timer (Roller Coaster)"],
        ["😀︎😀︎😀︎ 5 min countdown timer😀︎ 😀︎😀︎😀︎ (roller😀︎😀︎😀︎coaster) 😀︎", "5 Min Countdown Timer (Roller Coaster)"],
    ];
    for (const testCase of titleCases) {
        const [input, expected] = testCase;
        it(input, async () => {
            expect(await formatTitleInternal(input, false, TitleFormatting.TitleCase, true)).toBe(expected);
        });
    }
});

describe("toSentenceCase", () => {
    const sentenceCases: [string, string][] = [
        ["Go on the table with a cat", "Go on the table with a cat"],
        ["Go On The Table With A Cat", "Go on the table with a cat"],
        ["Go On The Table With A Cat From The U.S", "Go on the table with a cat from the U.S"],
        ["Go on the Table with a Cat", "Go on the table with a cat"],
        ["Go on the table with a cat named Pat", "Go on the table with a cat named Pat"],
        ["Go on the table with a cat named Pat from the U.S", "Go on the table with a cat named Pat from the U.S"],
        ["5 Minute Spring Timer (2021)", "5 minute spring timer (2021)"],
        ["AWESOME ART TRICKS and EASY DRAWING HACKS", "Awesome art tricks and easy drawing hacks"],
        ["5 Min Countdown Timer (Roller Coaster) 🎢", "5 min countdown timer (roller coaster) 🎢"],
        ["5 min countdown timer by Jim (roller coaster) 🎢", "5 min countdown timer by Jim (roller coaster) 🎢"],
        ["5 min COUNTDOWN timer by Jim (roller coaster) 🎢", "5 min countdown timer by Jim (roller coaster) 🎢"],
        ["5 Minute Timer Bomb [COKE AND MENTOS] 💣", "5 minute timer bomb [coke and mentos] 💣"],
        ["The car is from the U.S.A", "The car is from the U.S.A"],
        ["When I Went To The Store", "When I went to the store"],
        ["When I WENT TO The Store", "When I went to the store"],
        ["A first title - Some subtitle", "A first title - Some subtitle"],
        ["A first title | the subtitle", "A first title | The subtitle"],
        ["A first title ~ The subtitle", "A first title ~ The subtitle"],
        ["A first title — The subtitle", "A first title — The subtitle"],
        ["A first title : The subtitle", "A first title : The subtitle"],
        ["A first title ; The subtitle", "A first title ; The subtitle"],
        ["Why Does OTT Sound so Good?", "Why does OTT sound so good?"],
        ["You Don't Understand EQ - PART 1", "You don't understand EQ - Part 1"],
        ["Tomorrow I'll Go To The US", "Tomorrow I'll go to the US"],
        ["Tomorrow I'llllllll Go To The US", "Tomorrow i'llllllll go to the US"],
        ["First title: The second title", "First title: The second title"],
        ["Prefer using Option<&T> over &Option", "Prefer using Option<&T> over &Option"],
        ["visionOS Success ISN'T Up to 3rd Party Devs", "visionOS success isn't up to 3rd party devs"],
        ["Lego 10321: Corvette - HANDS-ON review", "Lego 10321: Corvette - Hands-on review"],
        ["Did you know that osu! is a game?", "Did you know that osu! is a game?"],
        ["Some interesting >title!", "Some interesting title!"],
        ["Did you know that >osssuu! >is a game?", "Did you know that osssuu! is a game?"],
        ["Some thing [TAS]", "Some thing [TAS]"],
        ["Some thing +HDDT", "Some thing +HDDT"],
        ["1st FC on Because Maybe // 996pp", "1st FC on because maybe // 996pp"],
    ];
    for (const testCase of sentenceCases) {
        const [input, expected] = testCase;
        it(input, async () => {
            expect(await toSentenceCase(input, false)).toBe(expected);
        });
    }
});

// Custom cases that should be retained as-is
describe("titleFormatter custom cases", () => {
    // original, title, sentence
    // original should not be capital unless necessary
    const customTitles: [string, string, string][] = [
        ["NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final","NaVi vs. FaZe - Map 1 [Inferno] - IEM Cologne 2022 - Grand Final","NaVi vs. FaZe - Map 1 [Inferno] - IEM Cologne 2022 - Grand final"], // multiple mixed capitalizations
        ["[SMii7Y VOD] CS:GO never changed","[SMii7Y VOD] CS:GO Never Changed","[SMii7Y VOD] CS:GO never changed"], // CS:GO
        ["MNM Gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1","MNM Gaming vs. W7M // BLAST R6 Copenhagen Major | Finals | Day 1","MNM Gaming vs. W7M // BLAST R6 Copenhagen major | Finals | Day 1"], // retain MNM and W7M
        ["GTA >V RP (2023-05-08)", "GTA V RP (2023-05-08)", "GTA V RP (2023-05-08)"], // retain GTA V RP
        ["m0NESY - 2023 highlights (CS:GO)", "m0NESY - 2023 Highlights (CS:GO)", "m0NESY - 2023 highlights (CS:GO)"], // don't capitalize m0NESY but retain CS:GO
        [">s1mple - the best player in the world - HLTV.org's #1 of 2021","s1mple - The Best Player in the World - HLTV.org's #1 of 2021","s1mple - The best player in the world - HLTV.org's #1 of 2021"], // keep s1mple, keep HLTV.org
        ["CS 1.6 vs CS:S vs CS:GO vs CS2 - weapons comparison", "CS 1.6 vs CS:S vs CS:GO vs CS2 - Weapons Comparison", "CS 1.6 vs CS:S vs CS:GO vs CS2 - Weapons comparison"], // lots of abbreviations
        ["Oh sh*t, y'all can hear that?! | C9 valorant voice comms #3 ft. Annie >alexis Jazzyk1ns meL >katsumi", "Oh Sh*t, Y'all Can Hear That? | C9 Valorant Voice Comms #3 ft. Annie alexis Jazzyk1ns meL katsumi", "Oh sh*t, y'all can hear that? | C9 valorant voice comms #3 ft. Annie alexis Jazzyk1ns meL katsumi"], // lots of names with purposeful capitalization
        ["Tarik reacts to team Shroud vs team meL II RE//LOAD - CROWN >x riot games VALORANT tour", "Tarik Reacts to Team Shroud vs Team meL II RE//LOAD - CROWN x Riot Games VALORANT Tour", "Tarik reacts to team Shroud vs team meL II RE//LOAD - CROWN x riot games VALORANT tour"], // meL, mix of RE//LOAD and CROWN
        [">2b2t's first war - >4chan vs. Facepunch (2011-2012)", "2b2t's First War - 4chan vs. Facepunch (2011-2012)", "2b2t's first war - 4chan vs. Facepunch (2011-2012)"], // preserve lower and upper cases
        ["Bill Swearingen - HAKC THE POLICE - DEF CON 27 conference", "Bill Swearingen - HAKC THE POLICE - DEF CON 27 Conference", "Bill Swearingen - HAKC THE POLICE - DEF CON 27 conference"], // preserve delibrate uppercases
        ["NA/TURALS: FINAL/LAP ft. Cloud9 meL & Jazzyk1ns | VCT NA game changers", "NA/TURALS: FINAL/LAP ft. Cloud9 meL & Jazzyk1ns | VCT NA Game Changers", "NA/TURALS: FINAL/LAP ft. Cloud9 meL & Jazzyk1ns | VCT NA game changers"], // keep titles, prefixes, lowercase usernames
        ["[MV] SEVENTEEN(세븐틴), >Ailee(에일리) _ Q&A", "[MV] SEVENTEEN(세븐틴), Ailee(에일리) _ Q&A", "[MV] SEVENTEEN(세븐틴), Ailee(에일리) _ Q&A"], // keep all caps in title for SEVENTEEN and [MV]
        ["AH-dventures in LA - >4K", "AH-dventures in LA - 4K", "AH-dventures in LA - 4K"], // capitalization for pun, 4K
        ["Welcome to the cunderground - GTA V: cunning stunts", "Welcome to the Cunderground - GTA V: Cunning Stunts", "Welcome to the cunderground - GTA V: Cunning stunts"], // GTA V:
        ["Achievement City, plan G(mod) - Gmod: TTT | let's play", "Achievement City, Plan G(mod) - Gmod: TTT | Let's Play", "Achievement City, plan G(mod) - Gmod: TTT | Let's play"], // Proper place, G(mod)
        ["Mad vs T1 - game 1 | round 1 Lol MSI 2023", "Mad vs T1 - Game 1 | Round 1 Lol MSI 2023", "Mad vs T1 - Game 1 | Round 1 Lol MSI 2023"], // LoL, MSI and T1
        ["The great awakening - 3D to 5D consciousness - 432 Hz + 963 Hz", "The Great Awakening - 3D to 5D Consciousness - 432 Hz + 963 Hz", "The great awakening - 3D to 5D consciousness - 432 Hz + 963 Hz"], // Hz, 3D, 5D
        ["H3VR early access devlog - update >110e1 - new revolver cartridges", "H3VR Early Access Devlog - Update 110e1 - New Revolver Cartridges", "H3VR early access devlog - Update 110e1 - New revolver cartridges"], // H3VR, e1
        ["Snapshot >23w14a", "Snapshot 23w14a", "Snapshot 23w14a"], // 23W14A
        ["Is the F-15EX secretly the best fighter jet ever made?", "Is the F-15EX Secretly the Best Fighter Jet Ever Made?", "Is the F-15EX secretly the best fighter jet ever made?"], // F-15EX
        ["US F-15s nose dive against each other | DCS", "US F-15s Nose Dive Against Each Other | DCS", "US F-15s nose dive against each other | DCS"], // DCS, F-15s
        ["F/A-18C Hornets execute no knock raid | DCS", "F/A-18C Hornets Execute No Knock Raid | DCS", "F/A-18C Hornets execute no knock raid | DCS"], // F/A-18C, DCS
        ["CS 1.6 - zombie plague / >zm_cubeworld_mini [küplere biniyoruz]", "CS 1.6 - Zombie Plague / zm_cubeworld_mini [Küplere Biniyoruz]", "CS 1.6 - Zombie plague / zm_cubeworld_mini [küplere biniyoruz]"], // preserve zm_cubeworld_mini
        [">f0rest vs. >x6tence @IEM IV european championship", "f0rest vs. x6tence @IEM IV European Championship", "f0rest vs. x6tence @IEM IV european championship"], // two lowercase names
        [">markeloff vs SK.swe (ESWC 2010 final)", "markeloff vs SK.swe (ESWC 2010 Final)", "markeloff vs SK.swe (ESWC 2010 final)"], // keep markeloff, keep SK.swe
        ["POV: >solo vs. Lunatic'hai @WCG >project_kr CS 1.6 demo", "POV: solo vs. Lunatic'hai @WCG project_kr CS 1.6 Demo", "POV: solo vs. Lunatic'hai @WCG project_kr CS 1.6 demo"], // solo, 'hai, project_kr
        ["POV: Neo vs. mythiX @GAMEGUNE Frag eXecutors CS 1.6 demo", "POV: Neo vs. mythiX @GAMEGUNE Frag eXecutors CS 1.6 Demo", "POV: Neo vs. mythiX @GAMEGUNE Frag eXecutors CS 1.6 demo"], // mythiX, eXecutors
        ["POV: >cogu vs. Eurotrip >mibr CS 1.6 demo", "POV: cogu vs. Eurotrip mibr CS 1.6 Demo", "POV: cogu vs. Eurotrip mibr CS 1.6 demo"], // cogu, Eurotrip, mibr
        [">n0thing vs. nMo @CEVO-P season VIII >(de_dust2)","n0thing vs. nMo @CEVO-P Season VIII (de_dust2)","n0thing vs. nMo @CEVO-P season VIII (de_dust2)"], // n0thing, nMo, VIII, de_dust2
        ["POV: >zet vs. a-Losers NiP CS 1.6 demo","POV: zet vs. a-Losers NiP CS 1.6 Demo","POV: zet vs. a-Losers NiP CS 1.6 demo"], // zet, a-Losers
        ["POV: >f0rest vs. Virtus.pro >fnatic CS 1.6 demo part1", "POV: f0rest vs. Virtus.pro fnatic CS 1.6 Demo Part1","POV: f0rest vs. Virtus.pro fnatic CS 1.6 demo part1"], // Virtus.pro, fnatic
        ["Announcements at >Google I/O 2023", "Announcements at Google I/O 2023", "Announcements at Google I/O 2023"], // Google sould be capitalized
        ["WWDC 2022 - iOS 16 announcement", "WWDC 2022 - iOS 16 Announcement", "WWDC 2022 - iOS 16 announcement"], // iOS should NOT be capitalized
        [`My thoughts on GM and Ford's move to abandon the CCS connector in favor of "NACS"`, `My Thoughts on GM and Ford's Move to Abandon the CCS Connector in Favor of "NACS"`, `My thoughts on GM and Ford's move to abandon the CCS connector in favor of "NACS"`],
    ];
    for (const testCase of customTitles) {
        const [input, title, sentence] = testCase;
        it(`toTitleCase "${input}"`, async () => {
            expect(await toTitleCase(input, true)).toBe(title);
        });
        it(`toSentenceCase "${input}"`, async () => {
            expect(await toSentenceCase(input, true)).toBe(sentence);
        });
    }
});

describe("cleanPunctuation", () => {
    const cases: [string, string][] = [
        ["Some interesting title!", "Some interesting title"],
        ["Some interesting title ?", "Some interesting title?"],
        ["Some interesting title!?", "Some interesting title?"],
        ["Some interesting title!?!?", "Some interesting title?"],
        ["Some interesting title!?!?!", "Some interesting title?"],
        ["Some interesting title????", "Some interesting title?"],
        ["Some interesting title !????", "Some interesting title?"],
        ["Some interesting title!?! ???", "Some interesting title?"],
        ["Some interesting title.", "Some interesting title"],
    ];
    for (const testCase of cases) {
        const [input, expected] = testCase;
        it(input, () => {
            expect(cleanPunctuation(input)).toBe(expected);
        });
    }
});