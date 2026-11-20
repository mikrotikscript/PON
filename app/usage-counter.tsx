'use client';

import { useEffect, useState } from 'react';

export default function UsageCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const record = () => setCount(value => value + 1);
    window.addEventListener('netforge:tool-use', record);
    return () => window.removeEventListener('netforge:tool-use', record);
  }, []);

  if (count === 0) return null;

  const src = `https://visitor-badge.laobi.icu/badge?page_id=netforge.tool-generations&left_text=GENERATED&left_color=111827&right_color=f97316&format=true&event=${count}`;

  return (
    <a className="netforge-hit-counter" href="https://laobi.icu/" target="_blank" rel="noopener noreferrer" aria-label="Total penggunaan tools NETFORGE" title="Total aksi generate NETFORGE">
      <img key={count} src={src} alt="NETFORGE generated tools" />
    </a>
  );
}
