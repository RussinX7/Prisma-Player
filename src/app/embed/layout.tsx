export default function EmbedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`html,body{background:transparent!important;background-color:transparent!important;color-scheme:normal!important}body{min-height:0!important}`}</style>
      {children}
    </>
  );
}
