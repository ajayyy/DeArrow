import * as React from "react";
import { FormattedText } from "../popup/FormattedTextComponent";
import Config, { TitleFormatting } from "../config/config";
import { casualVoteCategories, CasualVoteCategory, casualWikiLink } from "../submission/casualVote.const";
import { ToggleOptionComponent } from "../popup/ToggleOptionComponent";

export const CasualChoiceComponent = () => {
    const [casualMode, setCasualMode] = React.useState(Config.config!.casualMode);
    const [activeCategories, setActiveCategories] = React.useState(Config.config!.casualModeSettings);
    const [showOriginalWhenCasual, setShowOriginalWhenCasual] = React.useState(Config.config!.showOriginalThumbWhenCasual);
    const [onlyShowCasualIconForCustom, setOnlyShowCasualIconForCustom] = React.useState(Config.config!.onlyShowCasualIconForCustom);
    const [showCustomOnHoverIfCasual, setShowCustomOnHoverIfCasual] = React.useState(Config.config!.showCustomOnHoverIfCasual);
    const [showOptionForShowCustomOnHoverIfCasual, setShowOptionForShowCustomOnHoverIfCasual] = React.useState(false);

    React.useEffect(() => {
        const update = () => {
            setShowOptionForShowCustomOnHoverIfCasual(Config.config!.showOriginalOnHover);
        }

        Config.configSyncListeners.push(update);
        update();

        return () => {
            Config.configSyncListeners = Config.configSyncListeners.filter((l) => l !== update);
        }
    });

    const [openAddCategoryMenu, setOpenAddCategoryMenu] = React.useState(false);

    return (
        <div className="casualChoicesContainer">
            <div className={`casualChoiceContainer classicMode ${!casualMode ? "selected" : ""}`}
                onClick={() => {
                    setCasualMode(false);
                    Config.config!.casualMode = false;
                    setOpenAddCategoryMenu(false);
                }}>
                <div className="casualChoiceTitle">
                    <FormattedText
                        langKey="ClassicMode"
                    />
                </div>

                <img src={chrome.runtime.getURL("icons/logo.svg")}
                    alt="logo"
                    className="casualChoiceLogo"
                    draggable={false}
                />

                <div className="casualChoiceDescription">
                    {chrome.i18n.getMessage("ClassicModeDescription").split("\n").map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}
                </div>
            </div>

            <div className={`casualChoiceContainer casualMode ${casualMode ? "selected" : ""}`}
                onClick={() => {
                    setCasualMode(true);
                    Config.config!.casualMode = true;
                    Config.config!.showInfoAboutCasualMode = false;
                    setOpenAddCategoryMenu(false);
                }}>
                <div className="casualChoiceTitle">
                    <FormattedText
                        langKey="CasualMode"
                    />
                </div>

                <img src={chrome.runtime.getURL("icons/logo-casual.svg")}
                    alt="logo"
                    className="casualChoiceLogo"
                    draggable={false}
                />

                <div className="casualChoiceDescription">
                    {chrome.i18n.getMessage("CasualModeDescription").split("\n").map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}

                    <a style={{textDecoration: "underline"}} 
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            href={casualWikiLink}>
                        <FormattedText
                            langKey="LearnMore"
                            titleFormatting={TitleFormatting.SentenceCase}
                        />
                    </a>
                </div>

                <div className="casualChoiceCategories">
                    {casualVoteCategories.filter((c) => activeCategories[c.id]).map((category) => {
                        return (<CategoryPill key={category.id} category={category} onDelete={() => {
                            delete Config.config!.casualModeSettings[category.id];
                            setActiveCategories(Config.config!.casualModeSettings);
                            Config.forceSyncUpdate("casualModeSettings");
                        }} />);
                    })}

                    {
                        Object.keys(activeCategories).length < casualVoteCategories.length &&
                        <div className="casualCategoryPill addButton">
                            <div className="casualCategoryPillContent"
                                onClick={(e) => {
                                    if (casualMode) e.stopPropagation();
                                    setOpenAddCategoryMenu(!openAddCategoryMenu);
                                }}>
                               <img src={chrome.runtime.getURL("icons/add.svg")} alt="Add icon"/>
                            </div>
                        </div>
                    }
                    {
                        openAddCategoryMenu &&
                        <div className="casualCategorySelectionAnchor">
                            <div className="casualCategorySelectionParent">
                                {casualVoteCategories.filter((c) => !activeCategories[c.id]).map((category) => {
                                    return (<CategorySelection key={category.id} category={category} onAdd={() => {
                                        Config.config!.casualModeSettings[category.id] = 1;
                                        setActiveCategories(Config.config!.casualModeSettings);
                                        Config.forceSyncUpdate("casualModeSettings");
                                    }} />);
                                })}
                            </div>
                        </div>
                    }

                    <ToggleOptionComponent
                        id="showOriginalWhenCasual"
                        style={{
                            paddingTop: "15px"
                        }}
                        onChange={(value) => {
                            setShowOriginalWhenCasual(value);
                            Config.config!.showOriginalThumbWhenCasual = value;
                        }}
                        value={showOriginalWhenCasual}
                        label={chrome.i18n.getMessage("showOriginalWhenCasual")}
                    />

                    <ToggleOptionComponent
                        id="onlyShowCasualIconForCustom"
                        style={{
                            paddingTop: "15px"
                        }}
                        onChange={(value) => {
                            setOnlyShowCasualIconForCustom(value);
                            Config.config!.onlyShowCasualIconForCustom = value;
                        }}
                        value={onlyShowCasualIconForCustom}
                        label={chrome.i18n.getMessage("onlyShowCasualIconForCustom")}
                    />

                    {
                        showOptionForShowCustomOnHoverIfCasual &&
                        <ToggleOptionComponent
                            id="showCustomOnHoverIfCasual"
                            style={{
                                paddingTop: "15px"
                            }}
                            onChange={(value) => {
                                setShowCustomOnHoverIfCasual(value);
                                Config.config!.showCustomOnHoverIfCasual = value;
                            }}
                            value={showCustomOnHoverIfCasual}
                            label={chrome.i18n.getMessage("showCustomOnHoverIfCasual")}
                        />
                    }
                </div>
            </div>
        </div>
    )
}

function CategoryPill(props: { category: CasualVoteCategory; onDelete: () => void }): JSX.Element {
    const [minimumVotes, setMinimumVotes] = React.useState(Config.config?.casualModeSettings[props.category.id] ?? 1);

    return (
        <div className="casualCategoryPill">
            <div className="casualCategoryPillContent">
                <FormattedText
                    langKey={props.category.key}
                />

                <div className="minimumVotes">
                    <div className="minimumVotesText">
                        <FormattedText
                            langKey="minimumVotes"
                        />:
                    </div>

                    <span className="minimumVotesButton"
                        onClick={() => {
                            if (minimumVotes > 1) {
                                setMinimumVotes(minimumVotes - 1);
                                Config.config!.casualModeSettings[props.category.id] = minimumVotes - 1;
                                Config.forceSyncUpdate("casualModeSettings");
                            }
                        }}>
                        <img src={chrome.runtime.getURL("icons/remove.svg")} alt="Remove icon"/>
                    </span>

                    <span className="minimumVotesNumber">
                        {minimumVotes}
                    </span>

                    <span className="minimumVotesButton"
                        onClick={() => {
                            setMinimumVotes(minimumVotes + 1);
                            Config.config!.casualModeSettings[props.category.id] = minimumVotes + 1;
                            Config.forceSyncUpdate("casualModeSettings");
                        }}>
                        <img src={chrome.runtime.getURL("icons/add.svg")} alt="Add icon"/>
                    </span>
                </div>
            </div>

            <div className="closeButton"
                onClick={props.onDelete}>
                <img src={chrome.runtime.getURL("icons/close.png")} width="10" height="10" alt="Close icon"/>
            </div>
        </div>
    );
}

function CategorySelection(props: { category: CasualVoteCategory; onAdd: () => void }): JSX.Element {
    return (
        <div className="casualCategorySelection"
            onClick={props.onAdd}>
            <FormattedText
                langKey={props.category.key}
            />
        </div>
    );
}