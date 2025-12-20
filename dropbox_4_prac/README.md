https://www.hellointerview.com/learn/system-design/in-a-hurry/key-technologies#blob-storage

MAIN point:

Why SparkMD5 (or any JS MD5 library) instead of native crypto.subtle.digest('SHA-256')?
* If you use native crypto.subtle.digest('SHA-256') on a 10 GB file in the browser, the tab will freeze for 30–90 seconds and sometimes crash.
With SparkMD5 → you can hash a 10 GB file in ~8–12 seconds smoothly while showing progress.



READ:
https://www.hellointerview.com/learn/system-design/problem-breakdowns/dropbox