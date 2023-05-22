import Config, { TitleFormatting } from "../config";

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

export function formatTitle(title: string, isCustom: boolean): string {
    switch (Config.config!.titleFormatting) {
        case TitleFormatting.CapitalizeWords:
            return toCapitalizeCase(title, isCustom);
        case TitleFormatting.TitleCase:
            return toTitleCase(title, isCustom);
        case TitleFormatting.SentenceCase:
            return toSentenceCase(title, isCustom);
        default:
            return cleanResultingTitle(title);
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

        if (word.match(/^[Ii]$|^[Ii]['’][a-zA-Z]{1,3}$/)) {
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
    return !!word && !!word.match(/[a-zA-Z]/) 
        && word.toUpperCase() === word 
        && !isAcronymStrict(word)
        && !word.match(/^[a-zA-Z]+[-~—]/); // USB-C not all caps
}

export function capitalizeFirstLetter(word: string): string {
    let result = "";

    for (const char of word) {
        if (char.match(/[a-zA-Z]/)) {
            result += char.toUpperCase() + word.substring(result.length + 1).toLowerCase();
            break;
        } else {
            result += char;
        }
    }

    return result;
}

function isWordCaptialCase(word: string): boolean {
    return !!word.match(/^[^a-zA-Z]*[A-Z][^A-Z]+$/);
}

/**
 * Not just capital at start
 */
function isWordCustomCaptialization(word: string): boolean {
    const capitalMatch = word.match(/[A-Z]/g);
    if (!capitalMatch) return false;

    const capitalNumber = capitalMatch.length;
    return capitalNumber > 1 || (capitalNumber === 1 && !isFirstLetterCaptial(word));
}

function isYear(word: string): boolean {
    return !!word.match(/^[0-9]{2,4}s$/);
}

function isWordAllLower(word: string): boolean {
    return !!word.match(/^[a-z]+$/);
}

function isFirstLetterCaptial(word: string): boolean {
    return !!word.match(/^[^a-zA-Z]*[A-Z]/);
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
    return !!word.match(/^[^a-zA-Z]*(\S\.)+(\S)?$/);
}

function startOfSentence(index: number, words: string[]): boolean {
    return index === 0 || isDelimeter(words[index - 1]);
}

function isDelimeter(char: string): boolean {
    return char.match(/^[-:;~—|]$/) !== null;
}

function cleanResultingTitle(title: string): string {
    return title.replace(/>/g, "").trim();
}