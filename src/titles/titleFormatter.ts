import Config, { TitleFormatting } from "../config";

const sentenceCaseNotCapitalized = [
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
            return title;
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

        if (word.toUpperCase() === "I") {
            result += word.toUpperCase() + " ";
        } else if (isAcronymStrict(word) 
            || (!inTitleCase && trustCaps && isAcronym(word))
            || (!inTitleCase && isWordCaptialCase(word)) 
            || (isCustom && isWordCustomCaptialization(word))
            || (!isAllCaps(word) && isWordCustomCaptialization(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            if (index === 0) {
                result += capitalizeFirstLetter(word) + " ";
            } else {
                result += word.toLowerCase() + " ";
            }
        }

        index++;
    }

    return result.trim();
}

export function toTitleCase(str: string, isCustom: boolean): string {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    let index = 0;
    for (const word of words) {
        const trustCaps = !mostlyAllCaps && 
            !(isAllCaps(words[index - 1]) || isAllCaps(words[index + 1]));

        if ((isCustom && isWordCustomCaptialization(word))
            || (!isAllCaps(word) && isWordCustomCaptialization(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            result += word + " ";
        } else if (result.length !== 0 && sentenceCaseNotCapitalized.includes(word.toLowerCase())) {
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

    return result.trim();
}

export function toCapitalizeCase(str: string, isCustom: boolean): string {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    for (const word of words) {
        if ((isCustom && isWordCustomCaptialization(word)) 
                || (!isAllCaps(word) && isWordCustomCaptialization(word))
                || (isFirstLetterCaptial(word) && 
                ((!mostlyAllCaps && isAcronym(word)) || isAcronymStrict(word)))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            result += capitalizeFirstLetter(word) + " ";
        }
    }

    return result.trim();
}

export function isInTitleCase(words: string[]): boolean {
    let count = 0;
    let ignored = 0;
    for (const word of words) {
        if (isWordCaptialCase(word)) {
            count++;
        } else if (!isWordAllLower(word) ||
                sentenceCaseNotCapitalized.includes(word.toLowerCase())) {
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
    return !!word && !!word.match(/[a-zA-Z]/) && word.toUpperCase() === word && !isAcronymStrict(word);
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

function isWordAllLower(word: string): boolean {
    return !!word.match(/^[a-z]+$/);
}

function isFirstLetterCaptial(word: string): boolean {
    return !!word.match(/^[^a-zA-Z]*[A-Z]/);
}

export function isAcronym(word: string): boolean {
    // 2 or less chars, or has dots after each letter except last word
    // U.S.A allowed
    return word.length <= 3 || isAcronymStrict(word);
}

export function isAcronymStrict(word: string): boolean {
    // U.S.A allowed
    return !!word.match(/^[^a-zA-Z]*(\S\.)+(\S)?$/);
}