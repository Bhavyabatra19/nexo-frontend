"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";

const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(skipAuth);

    useEffect(() => {
        if (skipAuth) {
            setIsAuthenticated(true);
            return;
        }
        if (!authService.isAuthenticated()) {
            router.push("/");
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-muted-foreground w-full">
                Loading...
            </div>
        );
    }

    return <>{children}</>;
}
