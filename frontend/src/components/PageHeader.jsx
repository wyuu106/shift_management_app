function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="page-header__description">{description}</p>
        )}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  );
}

export default PageHeader;
