import Footer from "./Footer";

function PublicPageLayout({ children, mainClassName = "page-shell" }) {
  return (
    <>
      <main className={mainClassName}>{children}</main>
      <Footer />
    </>
  );
}

export default PublicPageLayout;
