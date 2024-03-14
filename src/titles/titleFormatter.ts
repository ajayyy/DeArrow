import { VideoID } from "../../maze-utils/src/video";
import Config, { TitleFormatting } from "../config/config";
import { getTitleFormatting, shouldCleanEmojis } from "../config/channelOverrides";
import { acronymBlocklist, allowlistedWords, notStartOfSentence, titleCaseDetectionNotCapitalized, titleCaseNotCapitalized } from "./titleFormatterData";
import { chromeP } from "../../maze-utils/src/browserApi";
import type { LanguageIdentifier } from "cld3-asm";

declare const LOAD_CLD: boolean;
let cld: Promise<LanguageIdentifier> | null = null;
if (LOAD_CLD) {
    const cldLib = import("cld3-asm");
    cld = cldLib.then(({ loadModule }) => loadModule()).then((m) => m.create(0, 700))
}

/**
 * Useful regex expressions:
 * 
 * Characters: \p{L}
 * Upper: \p{Lu}
 * Lower: \p{Ll}
 * 
 * https://javascript.info/regexp-unicode#example-hexadecimal-numbers
 * https://util.unicode.org/UnicodeJsps/character.jsp
 */

export async function formatTitle(title: string, isCustom: boolean, videoID: VideoID | null): Promise<string> {
    return formatTitleInternal(title, isCustom, await getTitleFormatting(videoID), await shouldCleanEmojis(videoID));
}

export async function formatTitleDefaultSettings(title: string, isCustom: boolean): Promise<string> {
    return await formatTitleInternal(title, isCustom, Config.config!.titleFormatting, Config.config!.shouldCleanEmojis);
}

export async function formatTitleInternal(title: string, isCustom: boolean, titleFormatting: TitleFormatting, shouldCleanEmojis: boolean): Promise<string> {
    if (shouldCleanEmojis) {
        title = cleanEmojis(title);
    }

    switch (titleFormatting) {
        case TitleFormatting.CapitalizeWords:
            return await toCapitalizeCase(title, isCustom);
        case TitleFormatting.TitleCase:
            return await toTitleCase(title, isCustom);
        case TitleFormatting.SentenceCase:
            return await toSentenceCase(title, isCustom);
        case TitleFormatting.LowerCase:
            return await toLowerCaseTitle(title);
        case TitleFormatting.FirstLetterUppercase:
            return await toFirstLetterUppercase(title);
        default: {
            return cleanUnformattedTitle(title);
        }
    }
}

export async function toLowerCaseTitle(str: string): Promise<string> {
    const words = str.split(" ");
    const { isGreek, isTurkiq } = await getLangInfo(str);

    let result = "";
    for (const word of words) {
        if (!isGreek && await greekLetterAllowed(word)) {
            result += word + " ";
        } else {
            result += await toLowerCase(word, isTurkiq) + " ";
        }
    }

    return cleanResultingTitle(result);
}

export async function toFirstLetterUppercase(str: string): Promise<string> {
    const words = str.split(" ");
    const { isGreek, isTurkiq } = await getLangInfo(str);

    let result = "";
    let index = 0;
    for (const word of words) {
        if (!isGreek && await greekLetterAllowed(word)) {
            result += word + " ";
        } else if (startOfSentence(index, words) && !isNumberThenLetter(word)) {
            result += await capitalizeFirstLetter(word, isTurkiq) + " ";
        } else {
            result += await toLowerCase(word, isTurkiq) + " ";
        }

        index++;
    }

    return cleanResultingTitle(result);
}

export async function toSentenceCase(str: string, isCustom: boolean): Promise<string> {
    const words = str.split(" ");
    const inTitleCase = isInTitleCase(words);
    const mostlyAllCaps = isMostlyAllCaps(words);
    const { isGreek, isTurkiq } = await getLangInfo(str);

    let result = "";
    let index = 0;
    for (const word of words) {
        const trustCaps = shouldTrustCaps(mostlyAllCaps, words, index);

        if (word.match(/^[Ii]$|^[Ii]['’][\p{L}]{1,3}$/u)) {
            result += await capitalizeFirstLetter(word, isTurkiq) + " ";
        } else if (forceKeepFormatting(word)
            || isAcronymStrict(word)
            || ((!inTitleCase || !isWordCapitalCase(word)) && trustCaps && isAcronym(word))
            || (!inTitleCase && isWordCapitalCase(word))
            || (isCustom && isWordCustomCapitalization(word))
            || (!isAllCaps(word) && isWordCustomCapitalization(word))
            || (!isGreek && await greekLetterAllowed(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            if (startOfSentence(index, words) && !isNumberThenLetter(word)) {
                if (!isAllCaps(word) && isWordCustomCapitalization(word)) {
                    result += word + " ";
                } else {
                    result += await capitalizeFirstLetter(word, isTurkiq) + " ";
                }
            } else {
                result += await toLowerCase(word, isTurkiq) + " ";
            }
        }

        index++;
    }

    return cleanResultingTitle(result);
}

export async function toTitleCase(str: string, isCustom: boolean): Promise<string> {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);
    const { isGreek, isTurkiq, isEnglish } = await getLangInfo(str);

    let result = "";
    let index = 0;
    for (const word of words) {
        const trustCaps = shouldTrustCaps(mostlyAllCaps, words, index);

        if (forceKeepFormatting(word)
            || (isCustom && isWordCustomCapitalization(word))
            || (!isAllCaps(word) && (isWordCustomCapitalization(word) || isNumberThenLetter(word)))
            || isYear(word)
            || (!isGreek && await greekLetterAllowed(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            result += word + " ";
        } else if ((!Config.config?.onlyTitleCaseInEnglish || isEnglish)
                && !startOfSentence(index, words) && listHasWord(titleCaseNotCapitalized, word.toLowerCase())) {
            // Skip lowercase check for the first word
            result += await toLowerCase(word, isTurkiq) + " ";
        } else if (isFirstLetterCapital(word) &&
            ((trustCaps && isAcronym(word)) || isAcronymStrict(word))) {
            // Trust it with capitalization
            result += word + " ";
        } else {
            result += await capitalizeFirstLetter(word, isTurkiq) + " ";
        }

        index++;
    }

    return cleanResultingTitle(result);
}

export async function toCapitalizeCase(str: string, isCustom: boolean): Promise<string> {
    const words = str.split(" ");
    const mostlyAllCaps = isMostlyAllCaps(words);
    const { isGreek, isTurkiq } = await getLangInfo(str);

    let result = "";
    for (const word of words) {
        if (forceKeepFormatting(word)
            || (isCustom && isWordCustomCapitalization(word))
            || (!isAllCaps(word) && isWordCustomCapitalization(word))
            || (isFirstLetterCapital(word) &&
                ((!mostlyAllCaps && isAcronym(word)) || isAcronymStrict(word)))
            || isYear(word)
            || (!isGreek && await greekLetterAllowed(word))) {
            // For custom titles, allow any not just first capital
            // For non-custom, allow any that isn't all caps
            // Trust it with capitalization
            result += word + " ";
        } else {
            result += await capitalizeFirstLetter(word, isTurkiq) + " ";
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
                listHasWord(titleCaseDetectionNotCapitalized, word.toLowerCase())) {
            ignored++;
        }
    }
    
    const length = words.length - ignored;
    return (length > 4 && count >= Math.min(length - 1, length * 0.9)) || count >= length;
}

function shouldTrustCaps(mostlyAllCaps: boolean, words: string[], index: number): boolean {
    return !mostlyAllCaps &&
        !((isAllCaps(words[index - 1]) && !forceKeepFormatting(words[index - 1]))
            || isAllCaps(words[index + 1]) && !forceKeepFormatting(words[index + 1]));
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

export async function capitalizeFirstLetter(word: string, isTurkiq: boolean): Promise<string> {
    const result: string[] = [];

    if (startsWithEmojiLetter(word)) {
        // Emoji letter is already "capitalized"
        return await toLowerCase(word, isTurkiq);
    }

    for (const char of word) {
        if (char.match(/[\p{L}]/u)) {
            // converts to an array in order to slice by Unicode code points
            // (for Unicode characters outside the BMP)
            result.push(await toUpperCase(char, isTurkiq) + await toLowerCase([...word].slice(result.length + 1).join(""), isTurkiq));
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

function startsWithEmojiLetter(word: string): boolean {
    return !!word.match(/^[^\p{L}]*[🅰🆎🅱🆑🅾][^\p{Lu}]+$/u);
}

/**
 * Not just capital at start
 */
function isWordCustomCapitalization(word: string): boolean {
    const capitalMatch = word.match(/[\p{Lu}]/gu);
    if (!capitalMatch) return false;

    const capitalNumber = capitalMatch.length;
    return capitalNumber > 1 || (capitalNumber === 1 && !isFirstLetterCapital(word) && !isHyphenatedFirstLetterCapital(word));
}

/**
 * non-Newtonian
 * Non-Newtonian
 * 
 * If the only capitals are after the dash
 */
function isHyphenatedFirstLetterCapital(word: string): boolean {
    return !!word.match(/^[\p{L}]{2,}-[\p{Lu}][\p{Ll}]+$/u);
}

/**
 * 3rd, 45th
 */
function isNumberThenLetter(word: string): boolean {
    return !!word.match(/^[「〈《【〔⦗『〖〘<({["'‘]*[0-9]+\p{L}[〙〗』⦘〕】》〉」)}\]"']*/u);
}

function isYear(word: string): boolean {
    return !!word.match(/^[「〈《【〔⦗『〖〘<({["'‘]*[0-9]{2,4}'?s[〙〗』⦘〕】》〉」)}\]"']*$/);
}

function isWordAllLower(word: string): boolean {
    return !!word.match(/^[\p{Ll}]+$/u);
}

function isFirstLetterCapital(word: string): boolean {
    return !!word.match(/^[^\p{L}]*[\p{Lu}]/u);
}

function forceKeepFormatting(word: string, ignorePunctuation = true): boolean {
    let result = !!word.match(/^>/)
        || listHasWord(allowlistedWords, word);

    if (ignorePunctuation) {
        const withoutPunctuation = word.replace(/[:?.!+\]]+$|^[[+:/]+/, "");
        if (word !== withoutPunctuation) {
            result ||= listHasWord(allowlistedWords, withoutPunctuation);
        }
    }

    // Allow hashtags
    if (!isAllCaps(word) && word.startsWith("#")) {
        return true;
    }

    return result;
}

/**
 * Allow mathematical greek symbols
 */
function greekLetterAllowed(word: string): boolean {
    return !!word.match(/[Ͱ-Ͽ]/);
}

async function toLowerCase(word: string, isTurkiq: boolean): Promise<string> {
    if (isTurkiq || word.match(/ı|İ/u) || await checkAnyLanguage(word, ["tr", "az"], 10)) {
        return word.toLocaleLowerCase("tr-TR")
    } else {
        return word.toLowerCase();
    }
}

async function toUpperCase(word: string, isTurkiq: boolean): Promise<string> {
    if (isTurkiq || word.match(/ı|İ/u) || await checkAnyLanguage(word, ["tr", "az"], 10)) {
        return word.toLocaleUpperCase("az-AZ")
    } else {
        return word.toUpperCase();
    }
}

async function getLangInfo(str: string): Promise<{
    isGreek: boolean;
    isTurkiq: boolean;
    isEnglish: boolean;
}> {
    if (str.split(" ").length > 1) {
        // Remove hashtags
        str = str.replace(/#[^\s]+/g, "").trim();
    }

    const threshold = 30;
    const result = await checkLanguages(str, ["el", "tr", "az", "en"], threshold);

    return {
        isGreek: result.results[0],
        isTurkiq: result.results[1] || result.results[2],

        // Not english if it detects no english, it is reliable, and the top language is the same when one word is removed
        // Helps remove false positives
        isEnglish: !(!result.results[3] 
            && result.isReliable 
            && Config.config?.onlyTitleCaseInEnglish // Only do further checks if enabled
            && result.topLanguage === ((await checkLanguages(str.replace(/[^ ]+$/, ""), [], threshold)).topLanguage))
    }
}

async function checkAnyLanguage(title: string, languages: string[], percentage: number): Promise<boolean> {
    return (await checkLanguages(title, languages, percentage)).results.every((v) => v);
}

async function checkLanguages(title: string, languages: string[], percentage: number): Promise<{
    results: boolean[];
    topLanguage?: string | null;
    isReliable: boolean;
}> {
    if (!cld && (typeof chrome === "undefined"
            || !("detectLanguage" in chrome.i18n))
            || typeof(window) === "undefined"
            || window.location.pathname.includes(".html")) {
        return {
            results: languages.map(() => false),
            isReliable: false
        };
    }

    try {
        const getLanguageFromBrowserApi = async (title: string) => {
            const result = await chromeP.i18n.detectLanguage(title);
            return result.languages.map((l) => ({...l, isReliable: result.isReliable}));
        };

        const detectedLanguages = cld 
            ? [(await (await cld).findLanguage(title))].map((l) => ({ language: l.language,
                    percentage: l.probability * 100, isReliable: l.is_reliable }))
            : await getLanguageFromBrowserApi(title);

        const result: boolean[] = [];
        for (const language of languages) {
            const matchingLanguage = detectedLanguages.find((l) => l.language === language);
            result.push(!!matchingLanguage && matchingLanguage.percentage > percentage);
        }
    
        return {
            results: result,
            topLanguage: detectedLanguages[0]?.language,
            isReliable: detectedLanguages.some((l) => l.isReliable)
        };
    } catch (e) {
        return {
            results: languages.map(() => false),
            isReliable: false
        };
    }
}

export function isAcronym(word: string): boolean {
    // 2 - 3 chars, or has dots after each letter except last word
    // U.S.A allowed
    // US allowed
    return ((word.length <= 3 || countLetters(word) <= 3)
        && word.length > 1 && isAllCaps(word) && !listHasWord(acronymBlocklist, word.toLowerCase()))
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
    return (word.match(/^[-:;~—–|]$/) !== null 
        || word.match(/[:?.!\]]$/) !== null)
        && !listHasWord(allowlistedWords, word)
        && !listHasWord(notStartOfSentence, word)
        && (!isAcronymStrict(word) || !word.endsWith("."));
}

export function cleanResultingTitle(title: string): string {
    return cleanUnformattedTitle(cleanPunctuation(title));
}

function cleanUnformattedTitle(title: string): string {
    return title.replace(/(^|\s)>(\S)/g, "$1$2").trim();
}

function cleanWordPunctuation(title: string): string {
    const words = title.trim().split(" ");
    if (words.length > 0 
            && (forceKeepFormatting(words[words.length - 1], false)
                || (isAcronymStrict(words[words.length - 1]) && words[words.length - 1].endsWith(".")))) {
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
            } else if (word.match(/[!]+$/)) {
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
    // \uFE0F is the emoji variation selector, it comes after non colored symbols to turn them into emojis
    // \uFE0E is similar but makes colored emojis into non colored ones
    // \u200D is the zero width joiner, it joins emojis together

    const cleaned = title
        // Clear extra spaces between emoji "words"
        .replace(/ ((?=\p{Extended_Pictographic}|☆)(?=[^🅰🆎🅱🆑🅾])\S(?:\uFE0F?\uFE0E?\p{Emoji_Modifier}?\u200D?)*)+(?= )/ug, "")
        // Emojis in between letters should be spaces, varient selector is allowed before to allow B emoji
        .replace(/(\p{L}|[\uFE0F\uFE0E🆎🆑])(?:(?=\p{Extended_Pictographic}|☆)(?=[^🅰🆎🅱🆑🅾])\S(?:\uFE0F?\uFE0E?\p{Emoji_Modifier}?\u200D?)*)+(?=\p{L}|[🅰🆎🅱🆑🅾])/ug, "$1 ")
        .replace(/(?=\p{Extended_Pictographic}|☆)(?=[^🅰🆎🅱🆑🅾])\S(?:\uFE0F?\uFE0E?\p{Emoji_Modifier}?\u200D?)*/ug, "")
        .trim();

    if (cleaned.length > 0) {
        return cleaned;
    } else {
        return title;
    }
}

function listHasWord(list: Set<string>, word: string): boolean {
    return list.has(word.replace(/[[「〈《【〔⦗『〖〘<({:〙〗』⦘〕】》〉」)}\]]/g, ""))
}


export async function localizeHtmlPageWithFormatting(): Promise<void> {
    // Localize by replacing __MSG_***__ meta tags
    const localizedTitle = await getLocalizedMessageWithFormatting(document.title);
    if (localizedTitle) document.title = localizedTitle;

    const body = document.querySelector(".sponsorBlockPageBody");
    const localizedMessage = await getLocalizedMessageWithFormatting(body!.innerHTML.toString());
    if (localizedMessage) body!.innerHTML = localizedMessage;
}

async function getLocalizedMessageWithFormatting(text: string): Promise<string | false> {
    const promises: Promise<string>[] = [];
    text.replace(/__MSG_(\w+)__|(DeArrow|Ajay Ramachandran)/g, (match, v1: string, v2) => {
        if (v2) {
            promises.push(formatTitle(v2, false, null));
        } else if (v1) {
            if (v1.match(/^what|Description\d?$/) && Config.config!.titleFormatting === TitleFormatting.TitleCase) {
                // Don't title case descriptions
                promises.push(Promise.resolve(chrome.i18n.getMessage(v1).replace(/</g, "&#60;")
                    .replace(/"/g, "&quot;")
                    .replace(/\n/g, "<br/>")));
            } else {
                promises.push(
                    formatTitle(chrome.i18n.getMessage(v1), false, null)
                        .then((result) => result.replace(/</g, "&#60;")
                                                .replace(/"/g, "&quot;")
                                                .replace(/\n/g, "<br/>")));
            }
        } else {
            promises.push(Promise.resolve(""));
        }

        return "";
    });

    const results = await Promise.all(promises);

    let count = 0;
    const valNewH = text.replace(/__MSG_(\w+)__|(DeArrow|Ajay Ramachandran)/g, () => {
        return results[count++];
    });

    if (valNewH != text) {
        return valNewH;
    } else {
        return false;
    }
}