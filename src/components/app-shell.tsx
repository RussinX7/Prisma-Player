import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="h-svh max-h-svh overflow-hidden flex flex-col bg-background">
			<SidebarProvider className="relative flex-1 overflow-hidden h-full">
				<AppSidebar />
				<SidebarInset className="md:peer-data-[variant=inset]:ml-0 flex flex-col h-full overflow-hidden bg-background">
					<AppHeader />
					<div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 flex flex-col gap-4">
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
