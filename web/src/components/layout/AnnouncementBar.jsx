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
        <div key={a.id} className="overflow-hidden relative" style={{ backgroundColor: a.bg_color, color: a.text_color }}>
          <div className="marquee">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="shrink-0 px-12 py-1.5 text-[12.5px] font-semibold tracking-wide">
                {a.text}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
