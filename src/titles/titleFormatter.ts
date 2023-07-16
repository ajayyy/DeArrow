import { VideoID } from "../maze-utils/video";
import Config, { TitleFormatting } from "../config/config";
import { getTitleFormatting, shouldCleanEmojis } from "../config/channelOverrides";
import { allowlistedWords, titleCaseNotCapitalized } from "./titleFormatterData";

/**
 * Useful regex expressions:
 * 
 * Characters: \p{L}
 * Upper: \p{Lu}
 * Lower: \p{Ll}
 */

export async function formatTitle(title: string, isCustom: boolean, videoID: VideoID | null): Promise<string> {
    return formatTitleInternal(title, isCustom, await getTitleFormatting(videoID), await shouldCleanEmojis(videoID));
}

export function formatTitleDefaultSettings(title: string, isCustom: boolean): string {
    return formatTitleInternal(title, isCustom, Config.config!.titleFormatting, Config.config!.shouldCleanEmojis);
}

export function formatTitleInternal(title: string, isCustom: boolean, titleFormatting: TitleFormatting, shouldCleanEmojis: boolean): string {
    if (shouldCleanEmojis) {
        title = cleanEmojis(title);
    }

    switch (titleFormatting) {
        case TitleFormatting.CapitalizeWords:
            return toCapitalizeCase(title, isCustom);
        case TitleFormatting.TitleCase:
            return toTitleCase(title, isCustom);
        case TitleFormatting.SentenceCase:
            return toSentenceCase(title, isCustom);
        case TitleFormatting.LowerCase:
            return toLowerCase(title);
        case TitleFormatting.FirstLetterUppercase:
            return toFirstLetterUppercase(title);
        default: {
            return cleanUnformattedTitle(title);
        }
    }
}

export function toLowerCase(str: string): string {
    const words = str.split(" ");

    let result = "";
    for (const word of words) {
        if (forceKeepFormatting(word)) {
            result += word + " ";
        } else {
            result += word.toLowerCase() + " ";
        }
    }

    return cleanResultingTitle(result);
}

export function toFirstLetterUppercase(str: string): string {
    const words = str.split(" ");

    let result = "";
    let index = 0;
    for (const word of words) {
        if (forceKeepFormatting(word)) {
            result += word + " ";
        } else if (startOfSentence(index, words) && !isNumberThenLetter(word)) {
            result += capitalizeFirstLetter(word) + " ";
        } else {
            result += word.toLowerCase() + " ";
        }

        index++;
    }

    return cleanResultingTitle(result);
}

export function toSentenceCase(str: string, isCustom: boolean): string {
    const words = str.split(" ");
    const inTitleCase = isInTitleCase(words);
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    let index = 0;
    for (const word of words) {
        const trustCaps = !mostlyAllCaps && 
            !(isAllCaps(words[index - 1]) || isAllCaps(words[index + 1]));

        if (word.match(/^[Ii]$|^[Ii]['’][\p{L}]{1,3}$/u)) {
            result += capitalizeFirstLetter(word) + " ";
        } else if (forceKeepFormatting(word)
            || isAcronymStrict(word) 
            || ((!inTitleCase || !isWordCapitalCase(word)) && trustCaps && isAcronym(word))
            || (!inTitleCase && isWordCapitalCase(word)) 
            || (isCustom && isWordCustomCapitalization(word))
            || (!isAllCaps(word) && isWordCustomCapitalization(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            if (startOfSentence(index, words) && !isNumberThenLetter(word)) {
                if (!isAllCaps(word) && isWordCustomCapitalization(word)) {
                    result += word + " ";
                } else {
                    result += capitalizeFirstLetter(word) + " ";
                }
            } else {
                result += word.toLowerCase() + " ";
            }
        }

        index++;
    }

    return cleanResultingTitle(result);
}

export function toTitleCase(str: string, isCustom: boolean): string {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    let index = 0;
    for (const word of words) {
        const trustCaps = !mostlyAllCaps && 
            !(isAllCaps(words[index - 1]) || isAllCaps(words[index + 1]));

        if (forceKeepFormatting(word)
            || (isCustom && isWordCustomCapitalization(word))
            || (!isAllCaps(word) && (isWordCustomCapitalization(word) || isNumberThenLetter(word)))
            || isYear(word)) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            result += word + " ";
        } else if (!startOfSentence(index, words) && titleCaseNotCapitalized.has(word.toLowerCase())) {
            // Skip lowercase check for the first word
            result += word.toLowerCase() + " ";
        } else if (isFirstLetterCapital(word) && 
                ((trustCaps && isAcronym(word)) || isAcronymStrict(word))) {
            // Trust it with capitalization
            result += word + " ";
        } else {
            result += capitalizeFirstLetter(word) + " ";
        }

        index++;
    }

    return cleanResultingTitle(result);
}

export function toCapitalizeCase(str: string, isCustom: boolean): string {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    for (const word of words) {
        if (forceKeepFormatting(word)
                || (isCustom && isWordCustomCapitalization(word)) 
                || (!isAllCaps(word) && isWordCustomCapitalization(word))
                || (isFirstLetterCapital(word) && 
                ((!mostlyAllCaps && isAcronym(word)) || isAcronymStrict(word)))
                || isYear(word)) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            result += capitalizeFirstLetter(word) + " ";
        }
    }

    return cleanResultingTitle(result);
}

export function isInTitleCase(words: string[]): boolean {
    let count = 0;
    let ignored = 0;
    for (const word of words) {
        if (isWordCapitalCase(word)) {
            count++;
        } else if (!isWordAllLower(word) ||
                titleCaseNotCapitalized.has(word.toLowerCase())) {
            ignored++;
        }
    }

    const length = words.length - ignored;
    return (length > 4 && count > length * 0.8) || count >= length;
}

export function isMostlyAllCaps(words: string[]): boolean {
    let count = 0;
    for (const word of words) {
        // Has at least one char and is upper case
        if (isAllCaps(word)) {
            count++;
        }
    }

    return count > words.length * 0.5;
}

/**
 * Has at least one char and is upper case
 */
function isAllCaps(word: string): boolean {
    return !!word && !!word.match(/[\p{L}]/u) 
        && word.toUpperCase() === word 
        && !isAcronymStrict(word)
        && !word.match(/^[\p{L}]{1,3}[-~—]/u); // USB-C not all caps, HANDS-ON is
}

export function capitalizeFirstLetter(word: string): string {
    const result: string[] = [];

    for (const char of word) {
        if (char.match(/[\p{L}]/u)) {
            // converts to an array in order to slice by Unicode code points
            // (for Unicode characters outside the BMP)
            result.push(char.toUpperCase() + [...word].slice(result.length + 1).join("").toLowerCase());
            break;
        } else {
            result.push(char);
        }
    }

    return result.join("");
}

function isWordCapitalCase(word: string): boolean {
    return !!word.match(/^[^\p{L}]*[\p{Lu}][^\p{Lu}]+$/u);
}

/**
 * Not just capital at start
 */
function isWordCustomCapitalization(word: string): boolean {
    const capitalMatch = word.match(/[\p{Lu}]/gu);
    if (!capitalMatch) return false;

    const capitalNumber = capitalMatch.length;
    return capitalNumber > 1 || (capitalNumber === 1 && !isFirstLetterCapital(word));
}

/**
 * 3rd, 45th
 */
function isNumberThenLetter(word: string): boolean {
    return !!word.match(/^[0-9]+\p{L}/u);
}

function isYear(word: string): boolean {
    return !!word.match(/^[0-9]{2,4}s$/);
}

function isWordAllLower(word: string): boolean {
    return !!word.match(/^[\p{Ll}]+$/u);
}

function isFirstLetterCapital(word: string): boolean {
    return !!word.match(/^[^\p{L}]*[\p{Lu}]/u);
}

function forceKeepFormatting(word: string, ignorePunctuation = true): boolean {
    let result = !!word.match(/^>/) 
        || allowlistedWords.has(word);

    if (ignorePunctuation) {
        const withoutPunctuation = word.replace(/[:?.!+\]]+$|^[[+:/]+/, "");
        if (word !== withoutPunctuation) {
            result ||= allowlistedWords.has(withoutPunctuation);
        }
    }

    return result;
}

export function isAcronym(word: string): boolean {
    // 2 - 3 chars, or has dots after each letter except last word
    // U.S.A allowed
    // US allowed
    return ((word.length <= 3 || countLetters(word) <= 3) && word.length > 1 && isAllCaps(word)) 
        || isAcronymStrict(word);
}

function countLetters(word: string): number {
    return word.match(/[\p{L}]/gu)?.length ?? 0;
}

export function isAcronymStrict(word: string): boolean {
    // U.S.A allowed
    return !!word.match(/^[^\p{L}]*(\S\.)+(\S)?$/u);
}

function startOfSentence(index: number, words: string[]): boolean {
    return index === 0 || isDelimeter(words[index - 1]);
}

function isDelimeter(word: string): boolean {
    return word.match(/^[-:;~—|]$/) !== null || word.match(/[:?.!]$/) !== null
        && !allowlistedWords.has(word);
}

export function cleanResultingTitle(title: string): string {
    return cleanUnformattedTitle(cleanPunctuation(title));
}

function cleanUnformattedTitle(title: string): string {
    return title.replace(/(^|\s)>(\S)/g, "$1$2").trim();
}

function cleanWordPunctuation(title: string): string {
    const words = title.trim().split(" ");
    if (words.length > 0 && forceKeepFormatting(words[words.length - 1], false)) {
        return title;
    }

    let toTrim = 0;
    let questionMarkCount = 0;
    for (let i = title.length - 1; i >= 0; i--) {
        toTrim = i;

        if (title[i] === "?") {
            questionMarkCount++;
        } else if (title[i] !== "!" && title[i] !== "." && title[i] !== " ") {
            break;
        }
    }

    let cleanTitle = toTrim === title.length ? title : title.substring(0, toTrim + 1);
    if (questionMarkCount > 0) {
        cleanTitle += "?";
    }

    return cleanTitle;
}

export function cleanPunctuation(title: string): string {
    title = cleanWordPunctuation(title);
    const words = title.split(" ");

    let result = "";
    let index = 0;
    for (let word of words) {
        if (!forceKeepFormatting(word, false) 
                && index !== words.length - 1) { // Last already handled
            if (word.includes("?")) {
                word = cleanWordPunctuation(word);
            } else if (word.match(/[.!]+$/)) {
                if (words.length > index + 1 && !isDelimeter(words[index + 1])) {
                    // Insert a period instead
                    word = cleanWordPunctuation(word) + ". ";
                } else {
                    word = cleanWordPunctuation(word);
                }
            }
        }

        word = word.trim();
        if (word.trim().length > 0) {
            result += word + " ";
        }

        index++;
    }

    return result.trim();
}

export function cleanEmojis(title: string): string {
    const cleaned = title
        .replace(/ \p{Extended_Pictographic}+(?= )/ug, "") // Clear extra spaces between emoji "words"
        .replace(/(\S)\p{Extended_Pictographic}(\S)/ug, "$1 $2") // Emojis in between letters should be spaces
        .replace(/\p{Extended_Pictographic}/ug, "");

    if (cleaned.trim().length > 0) {
        return cleaned;
    } else {
        return title;
    }
}
