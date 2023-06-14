import { VideoID } from "@ajayyy/maze-utils/lib/video";
import Config, { TitleFormatting } from "../config/config";
import { getTitleFormatting } from "../config/channelOverrides";

/**
 * Useful regex expressions:
 * 
 * Characters: \p{L}
 * Upper: \p{Lu}
 * Lower: \p{Ll}
 */

const titleCaseNotCapitalized = [
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "nor",
    "for",
    "yet",
    "so",
    "as",
    "in",
    "of",
    "on",
    "to",
    "from",
    "into",
    "like",
    "over",
    "with",
    "w/",
    "upon",
    "at",
    "by",
    "via",
    "to",
    "vs",
    "v.s.",
    "vs.",
    "ft",
    "ft.",
    "feat",
    "etc.",
    "etc"
];

export async function formatTitle(title: string, isCustom: boolean, videoID: VideoID | null): Promise<string> {
    return formatTitleInternal(title, isCustom, await getTitleFormatting(videoID));
}

export function formatTitleDefaultSettings(title: string, isCustom: boolean): string {
    return formatTitleInternal(title, isCustom, Config.config!.titleFormatting);
}

function formatTitleInternal(title: string, isCustom: boolean, titleFormatting: TitleFormatting): string {
    switch (titleFormatting) {
        case TitleFormatting.CapitalizeWords:
            return toCapitalizeCase(title, isCustom);
        case TitleFormatting.TitleCase:
            return toTitleCase(title, isCustom);
        case TitleFormatting.SentenceCase:
            return toSentenceCase(title, isCustom);
        default:
            return cleanUnformattedTitle(title);
    }
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
            || ((!inTitleCase || !isWordCaptialCase(word)) && trustCaps && isAcronym(word))
            || (!inTitleCase && isWordCaptialCase(word)) 
            || (isCustom && isWordCustomCaptialization(word))
            || (!isAllCaps(word) && isWordCustomCaptialization(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            if (startOfSentence(index, words)) {
                result += capitalizeFirstLetter(word) + " ";
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
            || (isCustom && isWordCustomCaptialization(word))
            || (!isAllCaps(word) && isWordCustomCaptialization(word))
            || isYear(word)) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            result += word + " ";
        } else if (!startOfSentence(index, words) && titleCaseNotCapitalized.includes(word.toLowerCase())) {
            // Skip lowercase check for the first word
            result += word.toLowerCase() + " ";
        } else if (isFirstLetterCaptial(word) && 
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
                || (isCustom && isWordCustomCaptialization(word)) 
                || (!isAllCaps(word) && isWordCustomCaptialization(word))
                || (isFirstLetterCaptial(word) && 
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
        if (isWordCaptialCase(word)) {
            count++;
        } else if (!isWordAllLower(word) ||
                titleCaseNotCapitalized.includes(word.toLowerCase())) {
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
        && !word.match(/^[\p{L}]+[-~—]/u); // USB-C not all caps
}

export function capitalizeFirstLetter(word: string): string {
    let result = "";

    for (const char of word) {
        if (char.match(/[\p{L}]/u)) {
            result += char.toUpperCase() + word.substring(result.length + 1).toLowerCase();
            break;
        } else {
            result += char;
        }
    }

    return result;
}

function isWordCaptialCase(word: string): boolean {
    return !!word.match(/^[^\p{L}]*[\p{Lu}][^\p{Lu}]+$/u);
}

/**
 * Not just capital at start
 */
function isWordCustomCaptialization(word: string): boolean {
    const capitalMatch = word.match(/[\p{Lu}]/gu);
    if (!capitalMatch) return false;

    const capitalNumber = capitalMatch.length;
    return capitalNumber > 1 || (capitalNumber === 1 && !isFirstLetterCaptial(word));
}

function isYear(word: string): boolean {
    return !!word.match(/^[0-9]{2,4}s$/);
}

function isWordAllLower(word: string): boolean {
    return !!word.match(/^[\p{Ll}]+$/u);
}

function isFirstLetterCaptial(word: string): boolean {
    return !!word.match(/^[^\p{L}]*[\p{Lu}]/u);
}

function forceKeepFormatting(word: string): boolean {
    return !!word.match(/^>/);
}

export function isAcronym(word: string): boolean {
    // 2 - 3 chars, or has dots after each letter except last word
    // U.S.A allowed
    // US allowed
    return (word.length <= 3 && word.length > 1 && isAllCaps(word)) || isAcronymStrict(word);
}

export function isAcronymStrict(word: string): boolean {
    // U.S.A allowed
    return !!word.match(/^[^\p{L}]*(\S\.)+(\S)?$/u);
}

function startOfSentence(index: number, words: string[]): boolean {
    return index === 0 || isDelimeter(words[index - 1]);
}

function isDelimeter(word: string): boolean {
    return word.match(/^[-:;~—|]$/) !== null || word.endsWith(":");
}

function cleanResultingTitle(title: string): string {
    return cleanPunctuation(cleanUnformattedTitle(title));
}

function cleanUnformattedTitle(title: string): string {
    return title.replace(/>/g, "").trim();
}

export function cleanPunctuation(title: string): string {
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