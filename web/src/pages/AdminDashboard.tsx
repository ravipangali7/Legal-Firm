import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AdminSidebar,
  AdminHeader,
  SuperAdminDashboard,
  AdminEditorDashboard,
  ClientDashboard,
  type UserRole,
} from '@/components/admin';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderDashboard = () => {
    switch (currentRole) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'admin':
      case 'editor':
        return <AdminEditorDashboard />;
      case 'client':
      case 'user':
        return <ClientDashboard />;
      default:
        return <SuperAdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Header */}
      <AdminHeader
        sidebarCollapsed={sidebarCollapsed}
        currentRole={currentRole}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Page Header with Role Switcher (Demo Only) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome to your admin dashboard
              </p>
            </div>
            
            {/* Role Switcher - Demo Only */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-200">
                Demo Mode
              </Badge>
              <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as UserRole)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Role-based Dashboard Content */}
          {renderDashboard()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
