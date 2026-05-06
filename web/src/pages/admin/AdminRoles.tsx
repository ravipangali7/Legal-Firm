import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Edit2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAdminStore, type Permission } from '@/store/adminStore';
import { useAdminModulePerm } from '@/hooks/useAdminModulePerm';

const PERM_KEYS: Array<keyof Omit<Permission, 'module'>> = ['view', 'create', 'edit', 'delete'];

const AdminRoles = () => {
  const {
    roles,
    modules,
    addModule,
    updateRolePermission,
    updateRoleMeta,
    apiConnected,
    adminSnapshotLoaded,
    refreshFromApi,
  } = useAdminStore();
  const canViewRoles = useAdminModulePerm('Roles', 'view');
  const canEditRoles = useAdminModulePerm('Roles', 'edit');
  const { toast } = useToast();
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.id ?? '');
  const [moduleOpen, setModuleOpen] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [editMeta, setEditMeta] = useState<{ id: string; name: string; description: string } | null>(null);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    if (!roles.length) {
      setActiveRoleId('');
      return;
    }
    setActiveRoleId((prev) => (roles.some((r) => r.id === prev) ? prev : roles[0]!.id));
  }, [roles]);

  if (!canViewRoles) {
    return <Navigate to="/admin" replace />;
  }

  const runMutation = async (fn: () => Promise<void>, successTitle: string) => {
    setMutating(true);
    try {
      await fn();
      toast({ title: successTitle });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setMutating(false);
    }
  };

  const submitModule = () => {
    const label = newModule.trim();
    if (!label) return;
    const dup = modules.some((m) => m.toLowerCase() === label.toLowerCase());
    if (dup) {
      toast({ title: 'Module already exists', variant: 'destructive' });
      return;
    }
    void (async () => {
      await runMutation(() => addModule(label), `Module "${label}" added`);
      setNewModule('');
      setModuleOpen(false);
    })();
  };

  const submitMeta = () => {
    if (!editMeta) return;
    const { id, name, description } = editMeta;
    void (async () => {
      await runMutation(() => updateRoleMeta(id, { name, description }), 'Role updated');
      setEditMeta(null);
    })();
  };

  const onTogglePerm = (roleId: string, roleKey: string, module: string, perm: keyof Omit<Permission, 'module'>, value: boolean) => {
    if (roleKey === 'super_admin' || !canEditRoles) return;
    void runMutation(() => updateRolePermission(roleId, module, perm, value), 'Permission updated');
  };

  if (!adminSnapshotLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">Manage what each role can access (data from the server)</p>
        </div>
        <Button onClick={() => setModuleOpen(true)} disabled={mutating || !canEditRoles}>
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {!apiConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load admin data from the API</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <span>The matrix below is preview-only until the server is reachable.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit shrink-0"
              onClick={() =>
                void refreshFromApi()
                  .then(() => toast({ title: 'Connected', description: 'Admin data refreshed.' }))
                  .catch(() => toast({ title: 'Still offline', variant: 'destructive' }))
              }
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permission modules yet. Add one to get started.</p>
          ) : (
            modules.map((m) => (
              <Badge key={m} variant="secondary">
                {m}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">No roles returned from the server. Run <code className="text-xs bg-muted px-1 rounded">seed_roles_permissions</code> or create roles in Django.</CardContent>
        </Card>
      ) : (
        <Tabs value={activeRoleId} onValueChange={setActiveRoleId}>
          <TabsList className="flex-wrap h-auto">
            {roles.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>
                {r.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {roles.map((role) => (
            <TabsContent key={role.id} value={role.id} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {role.name}{' '}
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={mutating || !canEditRoles}
                    onClick={() => setEditMeta({ id: role.id, name: role.name, description: role.description })}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        {PERM_KEYS.map((k) => (
                          <TableHead key={k} className="text-center capitalize">
                            {k}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {role.permissions.map((p) => (
                        <TableRow key={p.module}>
                          <TableCell className="font-medium">{p.module}</TableCell>
                          {PERM_KEYS.map((k) => (
                            <TableCell key={k} className="text-center">
                              <Checkbox
                                checked={role.key === 'super_admin' ? true : p[k]}
                                disabled={mutating || role.key === 'super_admin' || !canEditRoles}
                                onCheckedChange={(v) => onTogglePerm(role.id, role.key, p.module, k, !!v)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {role.key === 'super_admin' && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Super Admin always has full access (enforced on the server).
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <p className="text-xs text-muted-foreground">
        <Link to="/admin/users" className="text-primary-onBg underline-offset-4 hover:underline">
          Users
        </Link>{' '}
        assign these roles; changing the matrix requires Roles â†’ Edit permission (
        <Link to="/admin" className="text-primary-onBg underline-offset-4 hover:underline">
          admin overview
        </Link>
        ).
      </p>

      <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new module</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Module name</Label>
            <Input
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
              placeholder="e.g. Newsletters"
              disabled={mutating}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitModule} disabled={mutating || !canEditRoles}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMeta} onOpenChange={(o) => !o && setEditMeta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
          </DialogHeader>
          {editMeta && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editMeta.name} onChange={(e) => setEditMeta({ ...editMeta, name: e.target.value })} disabled={mutating} />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editMeta.description}
                  onChange={(e) => setEditMeta({ ...editMeta, description: e.target.value })}
                  disabled={mutating}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMeta(null)}>
              Cancel
            </Button>
            <Button onClick={submitMeta} disabled={mutating || !canEditRoles}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoles;
