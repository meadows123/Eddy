import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const OpenRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hash = window.location.hash?.replace('#', '') || '';
      const hashParams = new URLSearchParams(hash);

      const target = searchParams.get('target') || hashParams.get('target');
      const access_token = searchParams.get('access_token') || hashParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token') || hashParams.get('refresh_token');

      const resolveReturnTo = (val) => {
        if (!val) return null;
        try {
          if (/^https?:\/\//i.test(val)) {
            const u = new URL(val);
            return u.pathname + u.search + u.hash;
          }
        } catch {}
        return val;
      };

      let returnTo = resolveReturnTo(searchParams.get('returnTo') || hashParams.get('returnTo'));
      if (!returnTo) {
        try { returnTo = resolveReturnTo(localStorage.getItem('lagosvibe_return_to')); } catch {}
      }

      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch {}

      // After session exists, optionally upsert profile from any pending data
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const raw = localStorage.getItem('lagosvibe_pending_profile');
          if (raw) {
            const pending = JSON.parse(raw);
            await supabase.from('profiles').upsert([{ id: user.id, ...pending }]);
            localStorage.removeItem('lagosvibe_pending_profile');
          }
        }
      } catch {}

      const defaultAfterConfirm = '/login';

      if (target === 'signup-confirm') {
        try { localStorage.removeItem('lagosvibe_return_to'); } catch {}
        navigate(returnTo || defaultAfterConfirm, { replace: true });
        return;
      }

      navigate('/', { replace: true });
    };

    handle();
  }, [navigate]);

  return null;
};

export default OpenRedirect;