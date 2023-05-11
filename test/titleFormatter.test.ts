import { capitalizeFirstLetter, isAcronym, isAcronymStrict, isInTitleCase, isMostlyAllCaps, toCapitalizeCase, toSentenceCase, toTitleCase } from "../src/titles/titleFormatter";

// Acronym Tests
describe("Acronym Tests", () => {
    const acronymCases: [string, boolean][] = [
        ["USA", true],
        ["U.S.A.", true],
        ["U.S.A.G", true],
        ["U.S.A.G.", true],
        ["SOMETHING", false],
    ]
    for (const testCase of acronymCases) {
        const [input, result] = testCase;
        it(`toTitleCase ${input}`, () => {
            expect(isAcronym(input)).toBe(result);
        });
    }
})

// Strict Acronym Tests
describe("Strict Acronym Tests", () => {
    const strictAcronymCases: [string, boolean][] = [
        ["U.S.", true],
        ["US", false],
    ]
    for (const testCase of strictAcronymCases) {
        const [input, result] = testCase;
        it(`toTitleCase ${input}`, () => {
            expect(isAcronymStrict(input)).toBe(result);
        });
    }
})

// Capitalize First Letter Tests
describe("Capitalize First Letter Tests", () => {
    const capitalizeFirstCases: [string, string][] = [
        ["word", "Word"],
        ["WORD", "Word"],
        ["[word]", "[Word]"],
        ["[WORD]", "[Word]"],
        ["[[-w", "[[-W"],
        ["[[-W", "[[-W"],
        ["2020", "2020"],
    ]
    for (const testCase of capitalizeFirstCases) {
        const [input, expected] = testCase;
        it(`toTitleCase ${input}`, () => {
            expect(capitalizeFirstLetter(input)).toBe(expected);
        });
    }
})

describe("titleFormatter", () => {
    it("isMostlyAllCaps SOME WORDS are ALL CAPS", () => {
        expect(isMostlyAllCaps(["SOME", "WORDS", "are", "ALL", "CAPS"])).toBe(true);
    });

    it("isMostlyAllCaps SOME Words are All CAPS.", () => {
        expect(isMostlyAllCaps(["SOME", "Words", "are", "All", "CAPS."])).toBe(false);
    });

    it("isInTitleCase Go on the Table with a Cat", () => {
        expect(isInTitleCase(["Go", "on", "the", "Table", "with", "a", "Cat"])).toBe(true);
    });

    it("isInTitleCase Go on the table with a cat", () => {
        expect(isInTitleCase(["Go", "on", "the", "table", "with", "a", "cat"])).toBe(false);
    });

    it("toCapitalizeCase Go on the table with a cat", () => {
        expect(toCapitalizeCase("Go on the table with a cat", false)).toBe("Go On The Table With A Cat");
    });

    it("toCapitalizeCase Go on the Table with a Cat", () => {
        expect(toCapitalizeCase("Go on the Table with a Cat", false)).toBe("Go On The Table With A Cat");
    });

    it("toTitleCase Go on the table with a cat", () => {
        expect(toTitleCase("Go on the table with a cat", false)).toBe("Go on the Table with a Cat");
    });

    it("toTitleCase Go On The Table With A Cat", () => {
        expect(toTitleCase("Go On The Table With A Cat", false)).toBe("Go on the Table with a Cat");
    });

    it("toTitleCase 5 Minute Timer [MOUSE MAZE] 🐭", () => {
        expect(toTitleCase("5 Minute Timer [MOUSE MAZE] 🐭", false)).toBe("5 Minute Timer [Mouse Maze] 🐭");
    });

    it("toTitleCase AWESOME ART TRICKS and EASY DRAWING HACKS", () => {
        expect(toTitleCase("AWESOME ART TRICKS and EASY DRAWING HACKS", false)).toBe("Awesome Art Tricks and Easy Drawing Hacks");
    });
    
    it("toTitleCase 5 min countdown timer (roller coaster) 🎢", () => {
        expect(toTitleCase("5 min countdown timer (roller coaster) 🎢", false)).toBe("5 Min Countdown Timer (Roller Coaster) 🎢");
    });

    it("toTitleCase 5 min COUNTDOWN timer from U.S.A (roller coaster) 🎢", () => {
        expect(toTitleCase("5 min COUNTDOWN timer from U.S.A (roller coaster) 🎢", false)).toBe("5 Min Countdown Timer from U.S.A (Roller Coaster) 🎢");
    });

    it("toTitleCase Going somewhere [U.S.A is the place]", () => {
        expect(toTitleCase("Going somewhere [U.S.A is the Great Place]", false)).toBe("Going Somewhere [U.S.A Is the Great Place]");
    });

    it("toTitleCase The car is from the U.S.A", () => {
        expect(toTitleCase("The car is from the U.S.A", false)).toBe("The Car Is from the U.S.A");
    });

    it("toTitleCase When I WENT TO The Store", () => {
        expect(toTitleCase("When I WENT TO The Store", false)).toBe("When I Went to the Store");
    });

    it("toSentenceCase Go on the table with a cat", () => {
        expect(toSentenceCase("Go on the table with a cat", false)).toBe("Go on the table with a cat");
    });

    it("toSentenceCase Go On The Table With A Cat", () => {
        expect(toSentenceCase("Go On The Table With A Cat", false)).toBe("Go on the table with a cat");
    });

    it("toSentenceCase Go On The Table With A Cat From The U.S", () => {
        expect(toSentenceCase("Go On The Table With A Cat From The U.S", false)).toBe("Go on the table with a cat from the U.S");
    });

    it("toSentenceCase Go on the Table with a Cat", () => {
        expect(toSentenceCase("Go on the Table with a Cat", false)).toBe("Go on the table with a cat");
    });

    it("toSentenceCase Go on the table with a cat named Pat", () => {
        expect(toSentenceCase("Go on the table with a cat named Pat", false)).toBe("Go on the table with a cat named Pat");
    });

    it("toSentenceCase Go on the table with a cat named Pat from the U.S", () => {
        expect(toSentenceCase("Go on the table with a cat named Pat from the U.S", false)).toBe("Go on the table with a cat named Pat from the U.S");
    });

    it("toSentenceCase 5 Minute Spring Timer (2021)", () => {
        expect(toSentenceCase("5 Minute Spring Timer (2021)", false)).toBe("5 minute spring timer (2021)");
    });

    it("toSentenceCase AWESOME ART TRICKS and EASY DRAWING HACKS", () => {
        expect(toSentenceCase("AWESOME ART TRICKS and EASY DRAWING HACKS", false)).toBe("Awesome art tricks and easy drawing hacks");
    });

    it("toSentenceCase 5 Min Countdown Timer (Roller Coaster) 🎢", () => {
        expect(toSentenceCase("5 Min Countdown Timer (Roller Coaster) 🎢", false)).toBe("5 min countdown timer (roller coaster) 🎢");
    });

    it("toSentenceCase 5 min countdown timer by Jim (roller coaster) 🎢", () => {
        expect(toSentenceCase("5 min countdown timer by Jim (roller coaster) 🎢", false)).toBe("5 min countdown timer by Jim (roller coaster) 🎢");
    });

    it("toSentenceCase 5 min COUNTDOWN timer by Jim (roller coaster) 🎢", () => {
        expect(toSentenceCase("5 min COUNTDOWN timer by Jim (roller coaster) 🎢", false)).toBe("5 min countdown timer by Jim (roller coaster) 🎢");
    });

    it("toSentenceCase 5 Minute Timer Bomb [COKE AND MENTOS] 💣", () => {
        expect(toSentenceCase("5 Minute Timer Bomb [COKE AND MENTOS] 💣", false)).toBe("5 minute timer bomb [coke and mentos] 💣");
    })

    it("toSentenceCase The car is from the U.S.A", () => {
        expect(toSentenceCase("The car is from the U.S.A", false)).toBe("The car is from the U.S.A");
    });

    it("toSentenceCase When I Went To The Store", () => {
        expect(toSentenceCase("When I Went To The Store", false)).toBe("When I went to the store");
    });

    it("toSentenceCase When I WENT TO The Store", () => {
        expect(toSentenceCase("When I Went To The Store", false)).toBe("When I went to the store");
    });
});

// Custom cases that should be retained as-is
describe("titleFormatter custom cases", () => {
    // original, title, sentence
    // original should not be capital unless necessary
    const customTitles: [string, string, string][] = [
        ["NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final","NaVi vs. FaZe - Map 1 [Inferno] - IEM Cologne 2022 - Grand Final","NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final"], // multiple mixed capitalizations
        ["[SMii7Y VOD] CS:GO never changed","[SMii7Y VOD] CS:GO Never Changed","[SMii7Y VOD] CS:GO never changed"], // CS:GO
        ["MNM Gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1","MNM Gaming vs. W7M // BLAST R6 Copenhagen Major | Finals | Day 1","MNM Gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1"], // retain MNM and W7M
        ["GTA >V RP (2023-05-08)", "GTA V RP (2023-05-08)", "GTA V RP (2023-05-08)"], // retain GTA V RP
        ["m0NESY - 2023 highlights (CS:GO)", "m0NESY - 2023 Highlights (CS:GO)", "m0NESY - 2023 highlights (CS:GO)"], // don't capitalize m0NESY but retain CS:GO
        [">s1mple - the best player in the world - HLTV.org's #1 of 2021","s1mple - the Best Player in the World - HLTV.org's #1 of 2021","s1mple - the best player in the world - HLTV.org's #1 of 2021"], // keep s1mple, keep HLTV.org
        ["CS 1.6 vs CS:S vs CS:GO vs CS2 - weapons comparison", "CS 1.6 vs CS:S vs CS:GO vs CS2 - Weapons Comparison", "CS 1.6 vs CS:S vs CS:GO vs CS2 - weapons comparison"], // lots of abbreviations
        ["Oh sh*t, y'all can hear that?! | C9 valorant voice comms #3 ft. Annie >alexis Jazzyk1ns meL >katsumi", "Oh Sh*t, Y'all Can Hear That?! | C9 Valorant Voice Comms #3 ft. Annie alexis Jazzyk1ns meL katsumi", "Oh sh*t, y'all can hear that?! | C9 valorant voice comms #3 ft. Annie alexis Jazzyk1ns meL katsumi"], // lots of names with purposeful capitalization
        ["Tarik reacts to team Shroud vs team meL II RE//LOAD - CROWN >x riot games VALORANT tour", "Tarik Reacts to Team Shroud vs Team meL II RE//LOAD - CROWN x Riot Games VALORANT Tour", "Tarik reacts to team Shroud vs team meL II RE//LOAD - CROWN x riot games VALORANT tour"], // meL, mix of RE//LOAD and CROWN
        [">2b2t's first war - >4chan vs. Facepunch (2011-2012)", "2b2t's First War - 4chan vs. Facepunch (2011-2012)", "2b2t's first war - 4chan vs. Facepunch (2011-2012)"], // preserve lower and upper cases
        ["Bill Swearingen - HAKC THE POLICE - DEF CON 27 conference", "Bill Swearingen - HAKC THE POLICE - DEF CON 27 Conference", "Bill Swearingen - HAKC THE POLICE - DEF CON 27 conference"], // preserve delibrate uppercases
        ["NA/TURALS: FINAL/LAP ft. Cloud9 meL & Jazzyk1ns | VCT NA game changers", "NA/TURALS: FINAL/LAP ft. Cloud9 meL & Jazzyk1ns | VCT NA Game Changers", "NA/TURALS: FINAL/LAP ft. Cloud9 meL & Jazzyk1ns | VCT NA game changers"], // keep titles, prefixes, lowercase usernames
        ["[MV] SEVENTEEN(세븐틴), >Ailee(에일리) _ Q&A", "[MV] SEVENTEEN(세븐틴), Ailee(에일리) _ Q&A", "[MV] SEVENTEEN(세븐틴), Ailee(에일리) _ Q&A"], // keep all caps in title for SEVENTEEN and [MV]
        ["AH-dventures in LA - >4K", "AH-dventures in LA - 4K", "AH-dventures in LA - 4K"], // capitalization for pun, 4K
        ["Welcome to the cunderground - GTA V: cunning stunts", "Welcome to the Cunderground - GTA V: Cunning Stunts", "Welcome to the cunderground - GTA V: cunning stunts"], // GTA V:
        ["Achievement City, plan G(mod) - Gmod: TTT | let's play", "Achievement City, Plan G(mod) - Gmod: TTT | Let's Play", "Achievement City, plan G(mod) - Gmod: TTT | let's play"], // Proper place, G(mod)
        ["Mad vs T1 - game 1 | round 1 Lol MSI 2023", "Mad vs T1 - Game 1 | Round 1 Lol MSI 2023", "Mad vs T1 - game 1 | round 1 Lol MSI 2023"], // LoL, MSI and T1
        ["The great awakening - 3D to 5D consciousness - 432 Hz + 963 Hz", "The Great Awakening - 3D to 5D Consciousness - 432 Hz + 963 Hz", "The great awakening - 3D to 5D consciousness - 432 Hz + 963 Hz"], // Hz, 3D, 5D
        ["H3VR early access devlog - update >110e1 - new revolver cartridges", "H3VR Early Access Devlog - Update 110e1 - New Revolver Cartridges", "H3VR early access devlog - update 110e1 - new revolver cartridges"], // H3VR, e1
        ["Snapshot >23w14a", "Snapshot 23w14a", "Snapshot 23w14a"], // 23W14A
        ["Is the F-15EX secretly the best fighter jet ever made?", "Is the F-15EX Secretly the Best Fighter Jet Ever Made?", "Is the F-15EX secretly the best fighter jet ever made?"], // F-15EX
        ["US F-15s nose dive against each other | DCS", "US F-15s Nose Dive Against Each Other | DCS", "US F-15s nose dive against each other | DCS"], // DCS, F-15s
        ["F/A-18C Hornets execute no knock raid | DCS", "F/A-18C Hornets Execute No Knock Raid | DCS", "F/A-18C Hornets execute no knock raid | DCS"], // F/A-18C, DCS
        ["CS 1.6 - zombie plague / >zm_cubeworld_mini [küplere biniyoruz]", "CS 1.6 - Zombie Plague / zm_cubeworld_mini [Küplere Biniyoruz]", "CS 1.6 - zombie plague / zm_cubeworld_mini [küplere biniyoruz]"], // preserve zm_cubeworld_mini
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
    ]
    for (const testCase of customTitles) {
        const [input, title, sentence] = testCase;
        it(`toTitleCase "${input}"`, () => {
            expect(toTitleCase(input, true)).toBe(title);
        });
        it(`toSentenceCase "${input}"`, () => {
            expect(toSentenceCase(input, true)).toBe(sentence);
        });
    }
})