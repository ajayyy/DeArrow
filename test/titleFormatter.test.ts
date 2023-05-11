import { capitalizeFirstLetter, isAcronym, isAcronymStrict, isInTitleCase, isMostlyAllCaps, toCapitalizeCase, toSentenceCase, toTitleCase } from "../src/titles/titleFormatter";

describe("titleFormatter", () => {
    it("isAcronym USA", () => {
        expect(isAcronym("USA")).toBe(true);
    });

    it("isAcronym U.S.A.", () => {
        expect(isAcronym("U.S.A.")).toBe(true);
    });

    it("isAcronym U.S.A.G", () => {
        expect(isAcronym("U.S.A.G")).toBe(true);
    });

    it("isAcronym U.S.A.G.", () => {
        expect(isAcronym("U.S.A.G.")).toBe(true);
    });

    it("isAcronym SOMETHING", () => {
        expect(isAcronym("SOMETHING")).toBe(false);
    });

    it("isAcronymStrict U.S.", () => {
        expect(isAcronymStrict("U.S.")).toBe(true);
    });

    it("isAcronymStrict US", () => {
        expect(isAcronymStrict("US")).toBe(false);
    });

    it("capitalizeFirstLetter word", () => {
        expect(capitalizeFirstLetter("word")).toBe("Word");
    });

    it("capitalizeFirstLetter WORD", () => {
        expect(capitalizeFirstLetter("WORD")).toBe("Word");
    });

    it("capitalizeFirstLetter [word]", () => {
        expect(capitalizeFirstLetter("[word]")).toBe("[Word]");
    });

    it("capitalizeFirstLetter [WORD]", () => {
        expect(capitalizeFirstLetter("[WORD]")).toBe("[Word]");
    });

    it("capitalizeFirstLetter [[-w", () => {
        expect(capitalizeFirstLetter("[[-w")).toBe("[[-W");
    });

    it("capitalizeFirstLetter [[-W", () => {
        expect(capitalizeFirstLetter("[[-W")).toBe("[[-W");
    });

    it("capitalizeFirstLetter 2020", () => {
        expect(capitalizeFirstLetter("2020")).toBe("2020");
    });

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

    it("toTitleCase custom MNM gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1", () => {
        expect(toTitleCase("MNM gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1", true)).toBe("MNM Gaming Vs. W7M // BLAST R6 Copenhagen Major | Finals | Day 1");
    });

    it("toTitleCase custom [SMii7Y VOD] CS:GO Never Changed", () => {
        expect(toTitleCase("[SMii7Y VOD] CS:GO Never Changed", true)).toBe("[SMii7Y VOD] CS:GO Never Changed");
    });

    it("toTitleCase custom NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final", () => {
        expect(toTitleCase("NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final", true)).toBe("NaVi Vs. FaZe - Map 1 [Inferno] - IEM Cologne 2022 - Grand Final");
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

    it("toSentenceCase custom MNM gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1", () => {
        expect(toSentenceCase("MNM gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1", true)).toBe("MNM gaming vs. W7M // BLAST R6 Copenhagen major | finals | day 1");
    })

    it("toSentenceCase custom [SMii7Y VOD] CS:GO Never Changed", () => {
        expect(toSentenceCase("[SMii7Y VOD] CS:GO Never Changed", true)).toBe("[SMii7Y VOD] CS:GO never changed");
    });

    it("toSentenceCase custom NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final", () => {
        expect(toSentenceCase("NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final", true)).toBe("NaVi vs. FaZe - map 1 [Inferno] - IEM Cologne 2022 - grand final");
    });
});