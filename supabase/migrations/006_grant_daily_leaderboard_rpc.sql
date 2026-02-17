-- If you already ran 005 before the GRANT was added, run this so the client can submit scores.
GRANT EXECUTE ON FUNCTION submit_daily_score(DATE, VARCHAR(100), INTEGER) TO anon;
