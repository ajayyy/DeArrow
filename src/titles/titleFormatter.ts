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
    "to"
];

export function formatTitle(title: string): string {
    switch (Config.config!.titleFormatting) {
        case TitleFormatting.CapitalizeWords:
            return toCapitalizeCase(title);
        case TitleFormatting.TitleCase:
            return toTitleCase(title);
        case TitleFormatting.SentenceCase:
            return toSentenceCase(title);
        default:
            return title;
    }
}

export function toSentenceCase(str: string): string {
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
        } else if (isAcronymStrict(word) ||
            (!inTitleCase && trustCaps && isAcronym(word)) ||
            (!inTitleCase && isWordCaptialCase(word))) {
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

export function toTitleCase(str: string): string {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    let index = 0;
    for (const word of words) {
        const trustCaps = !mostlyAllCaps && 
            !(isAllCaps(words[index - 1]) || isAllCaps(words[index + 1]));

        // Skip lowercase check for the first word
        if (result.length !== 0 && sentenceCaseNotCapitalized.includes(word.toLowerCase())) {
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

export function toCapitalizeCase(str: string): string {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);

    let result = "";
    for (const word of words) {
        if (isFirstLetterCaptial(word) && 
                ((!mostlyAllCaps && isAcronym(word)) || isAcronymStrict(word))) {
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

function isWordAllLower(word: string): boolean {
    return !!word.match(/^[a-z]+$/);
}

function isFirstLetterCaptial(word: string): boolean {
    return !!word.match(/^[A-Z]/);
}

export function isAcronym(word: string): boolean {
    // 2 or less chars, or has dots after each letter except last word
    // U.S.A allowed
    return word.length <= 3 || isAcronymStrict(word);
}

export function isAcronymStrict(word: string): boolean {
    // U.S.A allowed
    return !!word.match(/^(\S\.)+(\S)?$/);
}