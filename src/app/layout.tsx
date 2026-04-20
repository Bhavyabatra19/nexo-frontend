import "./globals.css";
import Providers from "@/components/Providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Nexo MVP",
    description: "Never lose touch with people who matter. Your personal CRM.",
    icons: {
        icon: '/Nexo-Logo.jpg',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
