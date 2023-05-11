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
        expect(toCapitalizeCase("Go on the table with a cat")).toBe("Go On The Table With A Cat");
    });

    it("toCapitalizeCase Go on the Table with a Cat", () => {
        expect(toCapitalizeCase("Go on the Table with a Cat")).toBe("Go On The Table With A Cat");
    });

    it("toTitleCase Go on the table with a cat", () => {
        expect(toTitleCase("Go on the table with a cat")).toBe("Go on the Table with a Cat");
    });

    it("toTitleCase Go On The Table With A Cat", () => {
        expect(toTitleCase("Go On The Table With A Cat")).toBe("Go on the Table with a Cat");
    });

    it("toTitleCase 5 Minute Timer [MOUSE MAZE] 🐭", () => {
        expect(toTitleCase("5 Minute Timer [MOUSE MAZE] 🐭")).toBe("5 Minute Timer [Mouse Maze] 🐭");
    });

    it("toTitleCase AWESOME ART TRICKS and EASY DRAWING HACKS", () => {
        expect(toTitleCase("AWESOME ART TRICKS and EASY DRAWING HACKS")).toBe("Awesome Art Tricks and Easy Drawing Hacks");
    });
    
    it("toTitleCase 5 min countdown timer (roller coaster) 🎢", () => {
        expect(toTitleCase("5 min countdown timer (roller coaster) 🎢")).toBe("5 Min Countdown Timer (Roller Coaster) 🎢");
    });

    it("toTitleCase 5 min COUNTDOWN timer from U.S.A (roller coaster) 🎢", () => {
        expect(toTitleCase("5 min COUNTDOWN timer from U.S.A (roller coaster) 🎢")).toBe("5 Min Countdown Timer from U.S.A (Roller Coaster) 🎢");
    });

    it("toSentenceCase Go on the table with a cat", () => {
        expect(toSentenceCase("Go on the table with a cat")).toBe("Go on the table with a cat");
    });

    it("toSentenceCase Go On The Table With A Cat", () => {
        expect(toSentenceCase("Go On The Table With A Cat")).toBe("Go on the table with a cat");
    });

    it("toSentenceCase Go On The Table With A Cat From The U.S", () => {
        expect(toSentenceCase("Go On The Table With A Cat From The U.S")).toBe("Go on the table with a cat from the U.S");
    });

    it("toSentenceCase Go on the Table with a Cat", () => {
        expect(toSentenceCase("Go on the Table with a Cat")).toBe("Go on the table with a cat");
    });

    it("toSentenceCase Go on the table with a cat named Pat", () => {
        expect(toSentenceCase("Go on the table with a cat named Pat")).toBe("Go on the table with a cat named Pat");
    });

    it("toSentenceCase Go on the table with a cat named Pat from the U.S", () => {
        expect(toSentenceCase("Go on the table with a cat named Pat from the U.S")).toBe("Go on the table with a cat named Pat from the U.S");
    });

    it("toSentenceCase 5 Minute Spring Timer (2021)", () => {
        expect(toSentenceCase("5 Minute Spring Timer (2021)")).toBe("5 minute spring timer (2021)");
    });

    it("toSentenceCase AWESOME ART TRICKS and EASY DRAWING HACKS", () => {
        expect(toSentenceCase("AWESOME ART TRICKS and EASY DRAWING HACKS")).toBe("Awesome art tricks and easy drawing hacks");
    });

    it("toSentenceCase 5 Min Countdown Timer (Roller Coaster) 🎢", () => {
        expect(toSentenceCase("5 Min Countdown Timer (Roller Coaster) 🎢")).toBe("5 min countdown timer (roller coaster) 🎢");
    });

    it("toSentenceCase 5 min countdown timer by Jim (roller coaster) 🎢", () => {
        expect(toSentenceCase("5 min countdown timer by Jim (roller coaster) 🎢")).toBe("5 min countdown timer by Jim (roller coaster) 🎢");
    });

    it("toSentenceCase 5 min COUNTDOWN timer by Jim (roller coaster) 🎢", () => {
        expect(toSentenceCase("5 min COUNTDOWN timer by Jim (roller coaster) 🎢")).toBe("5 min countdown timer by Jim (roller coaster) 🎢");
    });

    it("toSentenceCase 5 Minute Timer Bomb [COKE AND MENTOS] 💣", () => {
        expect(toSentenceCase("5 Minute Timer Bomb [COKE AND MENTOS] 💣")).toBe("5 minute timer bomb [coke and mentos] 💣");
    })
});