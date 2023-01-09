import React = require("react");
import { TitleResult } from "../titles/titleData";
import { TitleComponent } from "./TitleComponent";

export interface TitleDrawerComponentProps {
    existingSubmissions: TitleResult[];
    onSelectOrUpdate: (title: TitleResult) => void;
}

export const TitleDrawerComponent = (props: TitleDrawerComponentProps) => {
    const [selectedTitle, setSelectedTitle] = React.useState(0);
    
    return (
        <>
            {getTitles(props, selectedTitle, setSelectedTitle)}
        </>
    );
};

function getTitles(props: TitleDrawerComponentProps,
        selectedTitle: number, setSelectedTitle: (val: number) => void): JSX.Element[] {
    const titles: JSX.Element[] = [];
    for (let i = 0; i < 3; i++) {
        titles.push(
            <TitleComponent
                large={selectedTitle === i}
                onSelectOrUpdate={(title) => {
                    setSelectedTitle(i);
                    props.onSelectOrUpdate({
                        ...props.existingSubmissions[i],
                        title
                    });
                }}
                key={i}
                submission={props.existingSubmissions[i]}
            ></TitleComponent>
        );
    }

    return titles;
}