import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const ADMIN_EMAIL = 'your-admin@email.com'; // TODO: Replace with your admin email
const PAGE_SIZE = 10;

const Admin = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState('');

  // Fetch paginated, filtered profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      setError('');
      try {
        let query = supabase.from('profiles').select('id, full_name, user_id, created_at', { count: 'exact' });
        if (search) {
          query = query.ilike('full_name', `%${search}%`);
        }
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);
        const { data, error, count } = await query;
        if (error) throw error;
        setProfiles(data || []);
        setTotalPages(count ? Math.ceil(count / PAGE_SIZE) : 1);
        // Fetch subscriptions for these users
        if (data && data.length > 0) {
          const userIds = data.map((p: any) => p.user_id);
          const { data: subs, error: subError } = await supabase
            .from('user_subscriptions')
            .select('user_id, plan_type, status, trial_end')
            .in('user_id', userIds);
          if (subError) throw subError;
          const subMap = {};
          (subs || []).forEach((s: any) => { subMap[s.user_id] = s; });
          setSubscriptions(subMap);
        } else {
          setSubscriptions({});
        }
      } catch (err) {
        setError('Failed to fetch profiles or subscriptions.');
      } finally {
        setLoading(false);
      }
    };
    if (user && user.email === ADMIN_EMAIL) {
      fetchProfiles();
    }
  }, [user, search, page]);

  // Delete profile
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this profile? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setProfiles((prev: any) => prev.filter((p: any) => p.id !== id));
    } catch (err) {
      alert('Failed to delete profile.');
    } finally {
      setDeletingId('');
    }
  };

  if (!user) {
    return <div className="p-8 text-center">Please sign in as admin to view this page.</div>;
  }
  if (user.email !== ADMIN_EMAIL) {
    return <div className="p-8 text-center text-red-500">Access denied. You are not the admin.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <input
              type="text"
              placeholder="Search by name or user ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="border rounded px-3 py-2 w-full md:w-64"
            />
            <div className="flex gap-2 items-center">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span>Page {page} of {totalPages}</span>
              <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
          {loading ? (
            <div>Loading users...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>User ID</th>
                  <th>Created At</th>
                  <th>Subscription</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p: any) => {
                  const sub = subscriptions[p.user_id];
                  return (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.full_name}</td>
                      <td>{p.user_id}</td>
                      <td>{p.created_at}</td>
                      <td>
                        {sub ? (
                          <div>
                            <div><b>Plan:</b> {sub.plan_type}</div>
                            <div><b>Status:</b> {sub.status}</div>
                            {sub.trial_end && <div><b>Trial End:</b> {sub.trial_end}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p.id)}
                        >
                          {deletingId === p.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin; 