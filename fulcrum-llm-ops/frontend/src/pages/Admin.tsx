import { Settings, Users, Key } from "lucide-react";

export function AdminPage() {
    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Admin Settings</h1>
                    <p className="text-muted-foreground">System configuration and user management</p>
                </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-muted/30 px-6 py-4 border-b flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold">Users & Roles</h2>
                </div>
                <div className="p-6">
                    <div className="text-sm text-muted-foreground mb-4">Manage access to the Ops Platform.</div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/10 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Last Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="px-4 py-3 font-medium">Admin User (You)</td>
                                <td className="px-4 py-3">Super Admin</td>
                                <td className="px-4 py-3 text-emerald-500">Active</td>
                                <td className="px-4 py-3 text-muted-foreground">Just now</td>
                            </tr>
                            <tr className="border-b">
                                <td className="px-4 py-3 font-medium">System Bot</td>
                                <td className="px-4 py-3">Service Account</td>
                                <td className="px-4 py-3 text-emerald-500">Active</td>
                                <td className="px-4 py-3 text-muted-foreground">2 mins ago</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-muted/30 px-6 py-4 border-b flex items-center gap-2">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold">API Keys</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">Manage API keys for external integrations.</p>
                        <div className="border rounded-md p-3 flex justify-between items-center bg-background/50">
                            <code className="text-xs font-mono">sk-proj-********************</code>
                            <div className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Active</div>
                        </div>
                        <button className="text-sm text-primary hover:underline">Regenerate Key</button>
                    </div>
                </div>

                <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-muted/30 px-6 py-4 border-b flex items-center gap-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold">System Config</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Maintenance Mode</span>
                            <div className="w-10 h-5 bg-muted rounded-full relative cursor-pointer"><div className="w-3 h-3 bg-muted-foreground absolute top-1 left-1 rounded-full" /></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Debug Logging</span>
                            <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer"><div className="w-3 h-3 bg-white absolute top-1 right-1 rounded-full" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
