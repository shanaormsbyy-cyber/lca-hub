import { initials } from '../utils';

export default function Avatar({ name, color, size = 'md', style = {} }) {
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ background: color || '#3AB5D9', ...style }}
    >
      {initials(name)}
    </div>
  );
}
