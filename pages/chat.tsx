import { NextPage } from "next";
import Head from "next/head";
import HeisenBot from "../components/HeisenBot";
import { NextPageWithLayout } from "./_app";

const ChatPage: NextPageWithLayout = () => {
    return (
        <>
            <Head>
                <title>HeisenBot | Quantum5ocial</title>
            </Head>
            <div style={{ margin: "0 auto", width: "100%", height: "100%" }}>
                <HeisenBot />
            </div>
        </>
    );
};

ChatPage.layoutProps = {
    variant: "two-left",
    right: null,
};

export default ChatPage;
