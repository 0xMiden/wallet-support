import { helpCenterMainCategories } from './categories';
import { articlesInSubcategory, helpCenterArticles } from './content';
import { HelpCenterFooter } from './HelpCenterFooter';
import { articleHref } from './routing';

export function AllTopics() {
  const firstCategoryId = helpCenterMainCategories[0]?.subcategories[0]?.id ?? '';
  return (
    <div className="help-center-home all-topics-page">
      <main className="all-topics-main" id="help-center-content" tabIndex={-1}>
        <header className="all-topics-intro">
          <p className="help-center-eyebrow">Bread Wallet support</p>
          <h1>All topics</h1>
          <p>Browse every guide, grouped by the task you are trying to complete.</p>
        </header>
        <div className="all-topics-grid">
          {helpCenterMainCategories.map(mainCategory => (
            <section className="all-topics-group" key={mainCategory.id}>
              <div className="all-topics-group-heading">
                <h2>{mainCategory.title}</h2>
                <p>{mainCategory.description}</p>
              </div>
              {mainCategory.subcategories.map(category => {
                const articles = articlesInSubcategory(helpCenterArticles, category.id);
                return (
                  <div className="all-topics-subcategory" key={category.id}>
                    <h3>{category.title}</h3>
                    <ul>
                      {articles.map(article => (
                        <li key={article.id}>
                          <a href={`/${articleHref(category.id, article.id)}`}>
                            <span>{article.title}</span><span aria-hidden="true">→</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </main>
      <HelpCenterFooter mainCategories={helpCenterMainCategories} firstCategoryId={firstCategoryId} />
    </div>
  );
}
