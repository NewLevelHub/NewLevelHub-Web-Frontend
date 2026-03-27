import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>NewLevelHub Frontend</h1>
          <p>
            Base web frontend is ready. CI/CD deploy to staging is configured via GitHub Actions.
          </p>
        </div>
        <div className={styles.ctas}>
          <span className={styles.primary}>Branch: develop/main</span>
          <span className={styles.secondary}>Target: staging</span>
        </div>
      </main>
    </div>
  );
}
