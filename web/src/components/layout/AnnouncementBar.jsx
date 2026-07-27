import { useQuery } from '@tanstack/react-query';
import { announcementApi } from '../../api';

export default function AnnouncementBar() {
  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementApi.list,
    staleTime: 2 * 60 * 1000,
  });

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const announcements = (data?.data?.announcements || []).filter((a) => {
    if (!a.scheduled_time) return true;
    const [h, m] = a.scheduled_time.split(':').map(Number);
    return nowMins >= h * 60 + m;
  });
  if (!announcements.length) return null;

  return (
    <div>
      {announcements.map((a) => (
        <div key={a.id}
          style={{ backgroundColor: a.bg_color, color: a.text_color, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marquee 22s linear infinite' }}>
            {[...Array(4)].map((_, i) => (
              <span key={i} style={{ padding: '7px 48px', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                {a.text}
              </span>
            ))}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
