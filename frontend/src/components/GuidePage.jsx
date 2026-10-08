import BackButton from "./BackButton";
import PageHeader from "./PageHeader";

import "./guidePage.css";

function GuideImages({ images }) {
  return (
    <div className="guide-section__images">
      {images.map((image) => (
        <img
          className="guide-section__image"
          src={image.src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          key={image.src}
        />
      ))}
    </div>
  );
}

function GuidePage({ description, backTo, sections }) {
  return (
    <div className="page">
      <PageHeader
        title="使用方法"
        description={description}
        action={<BackButton to={backTo} />}
      />

      <div className="guide-list">
        {sections.map((section, index) => (
          <section className="guide-section card" key={section.title}>
            <div className="guide-section__heading">
              <span>{index + 1}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
            </div>

            <ol className="guide-section__steps">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <GuideImages images={section.images} />
          </section>
        ))}
      </div>
    </div>
  );
}

export default GuidePage;
