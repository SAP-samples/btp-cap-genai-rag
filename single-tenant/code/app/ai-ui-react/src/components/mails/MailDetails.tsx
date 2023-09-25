import { useContext, useEffect, useState } from "react";
import {
    FlexBox,
    FlexBoxAlignItems,
    FlexBoxJustifyContent,
    Panel,
    TextArea,
    Title,
    ObjectStatus,
    Switch,
    Ui5CustomEvent,
    SwitchDomRef,
    Text,
    Button,
    TextAreaDomRef,
    BusyIndicator
} from "@ui5/webcomponents-react";
import { RadialChart } from "@ui5/webcomponents-react-charts";
import { IMailContext, MailContext } from "../../context/MailContext";

const MailList = () => {
    const [isTranslation, setIsTranslation] = useState<boolean>(false);
    const [response, setResponse] = useState<string>();

    const { deleteMail, selectedMail: mail, isFetchingMail } = useContext<IMailContext>(MailContext);
    useEffect(() => {
        setResponse(mail.potentialResponse);
    }, [mail]);

    return (
        <Panel headerText="Insights" fixed>
            <div style={{ height: "calc(100vh - 52px - 64px - 52px - 64px)" }}>
                {isFetchingMail ? (
                    <FlexBox
                        style={{ height: "100%" }}
                        direction="Row"
                        justifyContent={FlexBoxJustifyContent.Center}
                        alignItems={FlexBoxAlignItems.Center}
                    >
                        <BusyIndicator active delay={0} />
                    </FlexBox>
                ) : (
                    <div style={{ padding: 16 }}>
                        <div>
                            <Title level="H3">{isTranslation ? mail.translationSubject : mail.subject}</Title>
                            <Text>{isTranslation ? mail.translationBody : mail.body}</Text>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <FlexBox
                                justifyContent={FlexBoxJustifyContent.SpaceBetween}
                                alignItems={FlexBoxAlignItems.Center}
                            >
                                <FlexBox
                                    justifyContent={FlexBoxJustifyContent.Start}
                                    alignItems={FlexBoxAlignItems.Center}
                                >
                                    <Switch
                                        checked={isTranslation}
                                        onChange={(event: Ui5CustomEvent<SwitchDomRef, never>) =>
                                            setIsTranslation(event.target.checked || false)
                                        }
                                    />
                                    <Title level="H6">Translate</Title>
                                </FlexBox>
                                <FlexBox
                                    justifyContent={FlexBoxJustifyContent.Start}
                                    alignItems={FlexBoxAlignItems.Center}
                                >
                                    <ObjectStatus
                                        state="Information"
                                        inverted
                                        style={{ marginLeft: 16, padding: 8, borderRadius: 16 }}
                                    >
                                        {mail.category}
                                    </ObjectStatus>
                                    <ObjectStatus
                                        state="Information"
                                        inverted
                                        style={{ marginLeft: 8, padding: 8, borderRadius: 16 }}
                                    >
                                        {mail.sender}
                                    </ObjectStatus>
                                </FlexBox>
                                <FlexBox
                                    justifyContent={FlexBoxJustifyContent.End}
                                    alignItems={FlexBoxAlignItems.Center}
                                >
                                    <FlexBox alignItems={FlexBoxAlignItems.Center}>
                                        <RadialChart
                                            value={Math.max(10, mail.urgency * 10)}
                                            style={{
                                                height: 50,
                                                width: 50
                                            }}
                                            color={numberToColorHsl(100 - mail.urgency * 10)}
                                            chartConfig={{
                                                innerRadius: "80%",
                                                margin: {
                                                    top: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    left: 0
                                                }
                                            }}
                                            displayValue={`${mail.urgency || 0}`}
                                            displayValueStyle={{
                                                fontSize: 20,
                                                fontWeight: "bold",
                                                fill: "#000"
                                            }}
                                        />
                                        <Title level="H4" style={{ marginLeft: 8 }}>
                                            Urgency
                                        </Title>
                                    </FlexBox>
                                    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ marginLeft: 16 }}>
                                        <RadialChart
                                            value={Math.max(10, mail.sentiment * 5 + 50)}
                                            style={{
                                                height: 50,
                                                width: 50
                                            }}
                                            color={numberToColorHsl(mail.sentiment * 5 + 50)}
                                            chartConfig={{
                                                innerRadius: "80%",
                                                margin: {
                                                    top: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    left: 0
                                                }
                                            }}
                                            displayValue={`${Math.floor((mail.sentiment + 10) / 2)}`}
                                            displayValueStyle={{
                                                fontSize: 20,
                                                fontWeight: "bold",
                                                fill: "#000"
                                            }}
                                        />
                                        <Title level="H4" style={{ marginLeft: 8 }}>
                                            Sentiment
                                        </Title>
                                    </FlexBox>
                                </FlexBox>
                            </FlexBox>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <Title level="H3">Summary</Title>
                            <Text>{isTranslation ? mail.translationSummary : mail.summary}</Text>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <Title level="H3">Response</Title>
                            <TextArea
                                rows={16}
                                value={response}
                                onChange={(event: Ui5CustomEvent<TextAreaDomRef, never>) =>
                                    setResponse(event.target.value || response)
                                }
                            />
                            <FlexBox direction="Column" alignItems={FlexBoxAlignItems.End}>
                                <div style={{ marginTop: 8 }}>
                                    <Button
                                        design="Negative"
                                        icon="delete"
                                        onClick={() => deleteMail(mail.ID)}
                                        style={{ marginRight: 8 }}
                                    >
                                        Delete
                                    </Button>
                                    <Button design="Emphasized" icon="save" onClick={() => console.log("updated")}>
                                        Update
                                    </Button>
                                </div>
                            </FlexBox>
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
};

export default MailList;

// percentage to color
function hslToRgb(h: number, s: number, l: number) {
    let r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

// convert a number to a color using hsl
const numberToColorHsl = (i: number) => {
    // as the function expects a value between 0 and 1, and red = 0° and green = 120°
    // we convert the input to the appropriate hue value
    const hue = (i * 1.2) / 360;
    // we convert hsl to rgb (saturation 100%, lightness 50%)
    const rgb = hslToRgb(hue, 1, 0.5);
    // we format to css value and return
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
};
