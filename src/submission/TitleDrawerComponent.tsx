import * as React from "react";
import { TitleComponent } from "./TitleComponent";

export interface TitleDrawerComponentProps {
    existingSubmissions: RenderedTitleSubmission[];
    onSelectOrUpdate: (title: RenderedTitleSubmission, oldTitle: string, index: number) => void;
    onDeselect: (index: number) => void;
    selectedTitleIndex: number;
}

export interface RenderedTitleSubmission {
    title: string;
    votable: boolean;
    original: boolean;
    locked: boolean;
}

export const TitleDrawerComponent = (props: TitleDrawerComponentProps) => {
    return (
        <>
            {getTitles(props, props.selectedTitleIndex)}
        </>
    );
};

function getTitles(props: TitleDrawerComponentProps,
        selectedTitle: number): JSX.Element[] {
    const titles: JSX.Element[] = [];
    for (let i = 0; i < props.existingSubmissions.length; i++) {
        titles.push(
            <TitleComponent
                selected={selectedTitle === i}
                onSelectOrUpdate={(title, oldTitle) => {
                    props.onSelectOrUpdate({
                        ...props.existingSubmissions[i],
                        title
                    }, oldTitle, i);
                }}
                onDeselect={() => {
                    props.onDeselect(i);
                }}
                key={i}
                submission={props.existingSubmissions[i]}
            ></TitleComponent>
        );
    }

    return titles;
}