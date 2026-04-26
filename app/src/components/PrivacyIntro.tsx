interface PrivacyIntroProps {
  onClose: () => void;
}

export default function PrivacyIntro({ onClose }: PrivacyIntroProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'var(--parchment)' }}
      />
      <div className="relative text-center p-8 max-w-md">
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2.25rem',
            fontWeight: 500,
            lineHeight: 1.3,
            color: 'var(--near-black)',
            marginBottom: 8,
          }}
        >
          PM Pilot
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--olive-gray)',
            marginBottom: 8,
          }}
        >
          单人项目驾驶舱
        </p>
        <div style={{ margin: '32px 0' }}>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.25rem',
              fontWeight: 500,
              color: 'var(--near-black)',
              marginBottom: 12,
            }}
          >
            你的数据只在你手中
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--olive-gray)',
              lineHeight: 1.6,
            }}
          >
            所有信息仅存储于本浏览器 IndexedDB 中，
            <br />
            绝不外传、无服务端、无追踪、隐私绝对可控。
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={onClose}
          autoFocus
        >
          开始使用
        </button>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--stone-gray)',
            marginTop: 8,
          }}
        >
          按 Enter 或点击开始
        </p>
      </div>
    </div>
  );
}
