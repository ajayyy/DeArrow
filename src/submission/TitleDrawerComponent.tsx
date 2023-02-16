import React = require("react");
import { TitleComponent } from "./TitleComponent";

export interface TitleDrawerComponentProps {
    existingSubmissions: RenderedTitleSubmission[];
    onSelectOrUpdate: (title: RenderedTitleSubmission, oldTitle: string) => void;
}

export interface RenderedTitleSubmission {
    title: string;
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
    for (let i = 0; i < Math.min(5, props.existingSubmissions.length); i++) {
        titles.push(
            <TitleComponent
                large={selectedTitle === i}
                onSelectOrUpdate={(title, oldTitle) => {
                    setSelectedTitle(i);
                    props.onSelectOrUpdate({
                        ...props.existingSubmissions[i],
                        title
                    }, oldTitle);
                }}
                key={i}
                submission={props.existingSubmissions[i]}
            ></TitleComponent>
        );
    }

    return titles;
}