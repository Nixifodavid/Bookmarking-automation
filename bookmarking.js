// ==UserScript==
// @name         Bookmarking Master Auto Submit V8.2 - DEEP3 Final + Settings Panel + ForceDone + CrossSite Defaults
// @namespace    http://tampermonkey.net/
// @version      8.2
// @description  Auto 3-step bookmark submission with editable lists + RUN/STOP/RESET/SETTINGS + FORCE DONE + cross-site SAVE/USE SAVED DEFAULT
// @match        https://www.pbookmarking.com/*
// @match        https://www.freebookmarkingsite.com/*
// @match        https://www.free-socialbookmarking.com/*
// @match        https://www.starbookmarking.com/*
// @match        https://www.newsocialbookmarkingsite.com/*
// @match        https://www.sbookmarking.com/*
// @match        https://www.bookmarkingfree.com/*
// @match        https://www.mbookmarking.com/*
// @match        https://www.abookmarking.com/*
// @match        https://www.rbookmarking.com/*
// @match        https://www.ubookmarking.com/*
// @match        https://www.ybookmarking.com/*
// @match        https://www.letsdobookmark.com/*
// @match        https://www.socialbookmarkingwebsite.com/*
// @match        https://www.fastbookmarkings.com/*
// @match        https://www.realbookmarking.com/*
// @match        https://www.pinksocialbookmarkingsite.com/*
// @match        https://www.freewebmarks.com/*
// @match        https://www.social-bookmarkingsites.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    /************************************************************
     * EARLY REDIRECT CHECK
     ************************************************************/

    (function checkPendingRedirect() {
        const target = sessionStorage.getItem("bm_redirect_target");
        const at = parseInt(sessionStorage.getItem("bm_redirect_at"), 10);

        if (!target || !Number.isFinite(at)) return;

        const now = Date.now();
        const delay = Math.max(0, at - now);

        console.log("[BM] Pending redirect found ->", target, "in", delay, "ms");

        sessionStorage.removeItem("bm_redirect_target");
        sessionStorage.removeItem("bm_redirect_at");

        setTimeout(() => {
            console.log("[BM] Firing pending redirect to:", target);
            forceRedirect(target);
        }, delay);
    })();

    /************************************************************
     * DEFAULT DATA (used when nothing saved yet)
     ************************************************************/

    const DEFAULT_URLS = [
        "https://facehun.com/QuickBookkeepingExperts",
        "https://facehun.com/blogs/284081/How-to-Fix-QuickBooks-Error-6189-Complete-Step-by-Step",
        "https://directoryvision.com/listings/quickbookkeepingexperts/",
        "https://socialcreditu.com/QuickBookkeepingExperts",
        "https://socialcreditu.com/post/263944_quickbooks-error-6189-support-how-to-fix-company-file-access-problems-and-get-qu.html",
        "https://gitflic.ru/user/quickbookkeepingexperts",
        "https://roberthad.podbean.com/e/how-to-fix-quickbooks-error-ps107-in-minutes/",
        "https://qb-error-support.freeforums.net/thread/2/fix-quickbooks-error-ps107-fast",
        "https://qb-error-support.weebly.com/blog/how-to-fix-quickbooks-error-6130-in-minutes",
        "https://qb-error-support.weebly.com/blog/how-to-fix-quickbooks-error-1407-fast",
        "https://www.governance-programming.org/forum/is-there-available-quickbooks-error-support-to-fix-all-errors-very-fast"
    ];

    const DEFAULT_TITLES = [
        "QB Customer Support services",
        "How to Fix QB Error 6189 Issues",
        "QB Enterprise Support Services",
        "QB Enterprise Support Experts",
        "Resolving QB Error 6189 Company File Problems",
        "QB Customer Support Community",
        "How to Fix QB Error PS107 Quickly",
        "QB Error PS107 Troubleshooting Solutions",
        "How to Resolve QB Error 6130 Problems",
        "How to Fix QB Error 1407 Issues",
        "QB Customer Support and Troubleshooting Services"
    ];

    const DEFAULT_DESCRIPTIONS = [
        "Connect with experienced bookkeeping professionals offering guidance for managing records, transactions, reports, and everyday accounting tasks with greater accuracy and organization.",
        "Learn practical ways to troubleshoot QB Error 6189, including company file access issues, multi-user conflicts, and common steps for restoring normal access.",
        "Discover bookkeeping assistance focused on maintaining financial records, organizing transactions, preparing reports, and supporting smoother day-to-day accounting workflows.",
        "Find helpful information about QB bookkeeping support, including accounting tasks, financial record management, company file assistance, and solutions for common software-related issues.",
        "Explore troubleshooting guidance for QB Error 6189, with useful information about company file connectivity, access problems, database issues, and potential resolution steps.",
        "Join a community focused on QB error support, troubleshooting discussions, bookkeeping topics, and practical information for addressing common accounting software challenges.",
        "Learn about QB Error PS107 and explore troubleshooting approaches for resolving update-related issues, checking software settings, and restoring regular payroll functionality.",
        "Explore practical information for addressing QB Error PS107, with troubleshooting suggestions related to payroll updates, software connectivity, and common configuration problems.",
        "Discover troubleshooting guidance for QB Error 6130, including company file concerns, connectivity checks, and steps that may help restore access and normal software operation.",
        "Find useful guidance for dealing with QB Error 1407, covering potential installation, configuration, or access-related causes and general troubleshooting approaches.",
        "Explore QB error support resources covering common software problems, troubleshooting techniques, company file concerns, and practical steps for resolving accounting workflow issues."
    ];

    const DEFAULT_TAGS = "Accounting";

    /************************************************************
     * CONFIG STORAGE KEYS  (PER-SITE — stays in localStorage)
     ************************************************************/

    const CFG = {
        URLS: "bm_cfg_urls",
        TITLES: "bm_cfg_titles",
        DESCRIPTIONS: "bm_cfg_descriptions",
        TAGS: "bm_cfg_tags"
    };

    // In-memory working copies (per-site)
    let URLS = [];
    let TITLES = [];
    let DESCRIPTIONS = [];
    let TAGS = "";

    /************************************************************
     * CROSS-SITE SAVED DEFAULT  (uses Tampermonkey GM_* storage)
     *
     * ONLY these four values travel between sites. Everything else
     * (working config, rotation indexes, done count, redirects) is
     * kept per-site in localStorage as before.
     ************************************************************/

    const GM_DEF = {
        URLS: "bm_def_urls",
        TITLES: "bm_def_titles",
        DESCRIPTIONS: "bm_def_descriptions",
        TAGS: "bm_def_tags"
    };

    const hasGM =
        typeof GM_setValue === "function" &&
        typeof GM_getValue === "function";

    function gmSet(key, value) {
        if (hasGM) {
            try { GM_setValue(key, value); return; } catch (e) {
                console.warn("[BM] GM_setValue failed.", e);
            }
        } else {
            console.warn("[BM] GM_setValue not available — cross-site default will not persist.");
        }
    }

    function gmGet(key, fallback) {
        if (hasGM) {
            try { return GM_getValue(key, fallback); } catch (e) {
                console.warn("[BM] GM_getValue failed.", e);
            }
        }
        return fallback;
    }

    function gmDelete(key) {
        if (hasGM && typeof GM_deleteValue === "function") {
            try { GM_deleteValue(key); } catch (e) { /* ignore */ }
        }
    }

    function saveAsDefault(urlsArr, titlesArr, descsArr, tagsStr) {
        gmSet(GM_DEF.URLS, JSON.stringify(urlsArr));
        gmSet(GM_DEF.TITLES, JSON.stringify(titlesArr));
        gmSet(GM_DEF.DESCRIPTIONS, JSON.stringify(descsArr));
        gmSet(GM_DEF.TAGS, tagsStr);
        console.log("[BM] Saved as DEFAULT (cross-site):",
            urlsArr.length, "URLs,",
            titlesArr.length, "Titles,",
            descsArr.length, "Descs");
    }

    function hasSavedDefault() {
        const raw = gmGet(GM_DEF.URLS, null);
        if (!raw) return false;
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) && arr.length > 0;
        } catch (e) {
            return false;
        }
    }

    function loadSavedDefault() {
        try {
            const urlsRaw = gmGet(GM_DEF.URLS, null);
            const titlesRaw = gmGet(GM_DEF.TITLES, null);
            const descsRaw = gmGet(GM_DEF.DESCRIPTIONS, null);
            const tagsRaw = gmGet(GM_DEF.TAGS, null);

            const urls = urlsRaw ? JSON.parse(urlsRaw) : null;
            const titles = titlesRaw ? JSON.parse(titlesRaw) : null;
            const descs = descsRaw ? JSON.parse(descsRaw) : null;

            if (!Array.isArray(urls) || !urls.length) return null;

            return {
                urls: urls,
                titles: Array.isArray(titles) ? titles : [],
                descs: Array.isArray(descs) ? descs : [],
                tags: tagsRaw != null ? tagsRaw : DEFAULT_TAGS
            };
        } catch (e) {
            console.warn("[BM] Failed to read saved default.", e);
            return null;
        }
    }

    function clearSavedDefault() {
        gmDelete(GM_DEF.URLS);
        gmDelete(GM_DEF.TITLES);
        gmDelete(GM_DEF.DESCRIPTIONS);
        gmDelete(GM_DEF.TAGS);
    }

    /************************************************************
     * PER-SITE WORKING CONFIG  (localStorage only)
     ************************************************************/

    function loadConfig() {
        try {
            const storedUrls = JSON.parse(localStorage.getItem(CFG.URLS) || "null");
            const storedTitles = JSON.parse(localStorage.getItem(CFG.TITLES) || "null");
            const storedDescs = JSON.parse(localStorage.getItem(CFG.DESCRIPTIONS) || "null");
            const storedTags = localStorage.getItem(CFG.TAGS);

            URLS = Array.isArray(storedUrls) && storedUrls.length ? storedUrls : DEFAULT_URLS.slice();
            TITLES = Array.isArray(storedTitles) && storedTitles.length ? storedTitles : DEFAULT_TITLES.slice();
            DESCRIPTIONS = Array.isArray(storedDescs) && storedDescs.length ? storedDescs : DEFAULT_DESCRIPTIONS.slice();
            TAGS = storedTags != null ? storedTags : DEFAULT_TAGS;
        } catch (e) {
            console.warn("[BM] Config load failed, using defaults.", e);
            URLS = DEFAULT_URLS.slice();
            TITLES = DEFAULT_TITLES.slice();
            DESCRIPTIONS = DEFAULT_DESCRIPTIONS.slice();
            TAGS = DEFAULT_TAGS;
        }

        console.log("[BM] Config loaded (per-site): URLs=", URLS.length, " Titles=", TITLES.length, " Descs=", DESCRIPTIONS.length);
    }

    function saveConfig(urlsArr, titlesArr, descsArr, tagsStr) {
        localStorage.setItem(CFG.URLS, JSON.stringify(urlsArr));
        localStorage.setItem(CFG.TITLES, JSON.stringify(titlesArr));
        localStorage.setItem(CFG.DESCRIPTIONS, JSON.stringify(descsArr));
        localStorage.setItem(CFG.TAGS, tagsStr);

        URLS = urlsArr.slice();
        TITLES = titlesArr.slice();
        DESCRIPTIONS = descsArr.slice();
        TAGS = tagsStr;

        console.log("[BM] Config saved (per-site): URLs=", URLS.length, " Titles=", TITLES.length, " Descs=", DESCRIPTIONS.length);
    }

    function clearConfig() {
        localStorage.removeItem(CFG.URLS);
        localStorage.removeItem(CFG.TITLES);
        localStorage.removeItem(CFG.DESCRIPTIONS);
        localStorage.removeItem(CFG.TAGS);
        loadConfig();
    }

    // Load per-site config on script start
    loadConfig();

    const URL_WAIT = 2500;
    const DETAILS_WAIT = 1500;
    const SUBMIT_WAIT = 2500;
    const CHECK_INTERVAL = 500;
    const REDIRECT_WAIT = 3000;

    /************************************************************
     * STORAGE  (PER-SITE — localStorage)
     ************************************************************/

    const STORAGE = {
        RUN: "bm_run",
        URL_INDEX: "bm_url_index",
        TITLE_INDEX: "bm_title_index",
        DESC_INDEX: "bm_desc_index",
        CURRENT_URL: "bm_current_url",
        CURRENT_TITLE: "bm_current_title",
        CURRENT_DESC: "bm_current_desc",
        STEP: "bm_step",
        DONE_COUNT: "bm_done_count"
    };

    function getNumber(key, fallback = 0) {
        const value = parseInt(localStorage.getItem(key), 10);
        return Number.isFinite(value) ? value : fallback;
    }

    function getNextURL() {
        if (!URLS.length) return "";
        let index = getNumber(STORAGE.URL_INDEX, 0);
        if (index >= URLS.length) index = 0;
        const url = URLS[index];
        localStorage.setItem(STORAGE.URL_INDEX, String((index + 1) % URLS.length));
        return url;
    }

    function getNextTitle() {
        if (!TITLES.length) return "";
        let index = getNumber(STORAGE.TITLE_INDEX, 0);
        if (index >= TITLES.length) index = 0;
        const title = TITLES[index];
        localStorage.setItem(STORAGE.TITLE_INDEX, String((index + 1) % TITLES.length));
        return title;
    }

    function getNextDescription() {
        if (!DESCRIPTIONS.length) return "";
        let index = getNumber(STORAGE.DESC_INDEX, 0);
        if (index >= DESCRIPTIONS.length) index = 0;
        const desc = DESCRIPTIONS[index];
        localStorage.setItem(STORAGE.DESC_INDEX, String((index + 1) % DESCRIPTIONS.length));
        return desc;
    }

    /************************************************************
     * HELPERS
     ************************************************************/

    function isRunning() {
        return localStorage.getItem(STORAGE.RUN) === "1";
    }

    function setRunning(value) {
        localStorage.setItem(STORAGE.RUN, value ? "1" : "0");
    }

    function incrementDoneCount() {
        const n = getNumber(STORAGE.DONE_COUNT, 0) + 1;
        localStorage.setItem(STORAGE.DONE_COUNT, String(n));
        console.log("[BM] Done count =", n, "/", URLS.length);
        return n;
    }

    function isAllDone() {
        return URLS.length > 0 && getNumber(STORAGE.DONE_COUNT, 0) >= URLS.length;
    }

    function isVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            element.offsetParent !== null
        );
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function setNativeValue(element, value) {
        if (!element) return;
        const prototype =
            element instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
        } else {
            element.value = value;
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function setSelectValue(select, value) {
        if (!select) return;
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function markStep(step) {
        localStorage.setItem(STORAGE.STEP, step);
    }

    /************************************************************
     * RESET
     ************************************************************/

    function resetAllProgress() {
        console.log("[BM] Resetting all rotation indexes and current selections...");

        localStorage.removeItem(STORAGE.URL_INDEX);
        localStorage.removeItem(STORAGE.TITLE_INDEX);
        localStorage.removeItem(STORAGE.DESC_INDEX);
        localStorage.removeItem(STORAGE.CURRENT_URL);
        localStorage.removeItem(STORAGE.CURRENT_TITLE);
        localStorage.removeItem(STORAGE.CURRENT_DESC);
        localStorage.removeItem(STORAGE.STEP);
        localStorage.removeItem(STORAGE.DONE_COUNT);

        sessionStorage.removeItem("bm_redirect_target");
        sessionStorage.removeItem("bm_redirect_at");
    }

    /************************************************************
     * FORCE DONE (unlock UI without resetting rotation)
     ************************************************************/

    function forceDone() {
        console.log("[BM] FORCE DONE pressed. Stopping automation and unlocking UI.");

        setRunning(false);
        controllerBusy = false;

        document.querySelectorAll("[data-bm-processing='1']").forEach(el => {
            delete el.dataset.bmProcessing;
        });

        sessionStorage.removeItem("bm_redirect_target");
        sessionStorage.removeItem("bm_redirect_at");

        setRunButtonIdle();
        setStopButtonDone();
    }

    /************************************************************
     * FORCE REDIRECT
     ************************************************************/

    function forceRedirect(url) {
        try { window.onbeforeunload = null; } catch (e) {}

        console.log("[BM] forceRedirect ->", url);

        try {
            window.location.replace(url);
        } catch (e) {
            try {
                window.location.assign(url);
            } catch (e2) {
                window.location.href = url;
            }
        }
    }

    /************************************************************
     * STEP DETECTION
     ************************************************************/

    function getCurrentStep() {
        const step1 = document.querySelector(".submit1");
        const step2 = document.querySelector(".submit2");
        const step3 = document.querySelector(".submit3");

        if (isVisible(step1)) return 1;
        if (isVisible(step2)) return 2;
        if (isVisible(step3)) return 3;

        return 0;
    }

    /************************************************************
     * STEP 1
     ************************************************************/

    async function processStep1() {
        if (!isRunning()) return;

        const urlField = document.querySelector("#checkUrl");
        const continueBtn = document.querySelector(".submit1 .checkUrl");

        if (!urlField || !continueBtn) {
            console.log("[BM] Step 1 elements not found.");
            return;
        }

        if (!isVisible(urlField) || !isVisible(continueBtn)) return;

        let currentURL = localStorage.getItem(STORAGE.CURRENT_URL);
        if (!currentURL) {
            currentURL = getNextURL();
            if (!currentURL) {
                console.warn("[BM] No URLs configured. Stopping.");
                setRunning(false);
                setRunButtonIdle();
                return;
            }
            localStorage.setItem(STORAGE.CURRENT_URL, currentURL);
        }

        console.log("[BM] Step 1 URL:", currentURL);
        setNativeValue(urlField, currentURL);
        markStep("1");

        await wait(URL_WAIT);
        if (!isRunning()) return;

        if (continueBtn.dataset.bmProcessing === "1") return;
        continueBtn.dataset.bmProcessing = "1";

        console.log("[BM] Clicking Continue...");
        continueBtn.click();

        await waitForStep(2, 10000);
        if (getCurrentStep() === 2) {
            console.log("[BM] Step 2 detected.");
            markStep("2");
        }
    }

    /************************************************************
     * STEP 2
     ************************************************************/

    async function processStep2() {
        if (!isRunning()) return;

        const titleField = document.querySelector("#articleTitle");
        const tagField = document.querySelector("#tag");
        const descField = document.querySelector("#description");
        const category = document.querySelector("#category");
        const saveBtn = document.querySelector(".submit2 .saveChanges");

        if (!titleField || !saveBtn) {
            console.log("[BM] Step 2 elements not found.");
            return;
        }

        if (!isVisible(titleField) || !isVisible(saveBtn)) return;

        let currentTitle = localStorage.getItem(STORAGE.CURRENT_TITLE);
        if (!currentTitle) {
            currentTitle = getNextTitle();
            localStorage.setItem(STORAGE.CURRENT_TITLE, currentTitle);
        }

        let currentDesc = localStorage.getItem(STORAGE.CURRENT_DESC);
        if (!currentDesc) {
            currentDesc = getNextDescription();
            localStorage.setItem(STORAGE.CURRENT_DESC, currentDesc);
        }

        console.log("[BM] Step 2 title:", currentTitle);
        console.log("[BM] Step 2 description:", currentDesc);

        setNativeValue(titleField, currentTitle);
        if (tagField) setNativeValue(tagField, TAGS);
        if (descField) setNativeValue(descField, currentDesc);

        if (category) {
            let businessOption = null;
            for (const option of category.options) {
                if (option.textContent.trim().toLowerCase() === "business") {
                    businessOption = option;
                    break;
                }
            }
            if (businessOption) {
                setSelectValue(category, businessOption.value);
                console.log("[BM] Category selected: Business");
            }
        }

        markStep("2");

        await wait(DETAILS_WAIT);
        if (!isRunning()) return;

        if (saveBtn.dataset.bmProcessing === "1") return;
        saveBtn.dataset.bmProcessing = "1";

        console.log("[BM] Clicking Save changes and submit...");
        saveBtn.click();

        await waitForStep(3, 10000);
        if (getCurrentStep() === 3) {
            console.log("[BM] Step 3 detected.");
            markStep("3");
        }
    }

    /************************************************************
     * STEP 3
     ************************************************************/

    async function processStep3() {
        if (!isRunning()) return;

        const submitBtn = document.querySelector("#submit");

        if (!submitBtn) {
            console.log("[BM] Submit button not found.");
            return;
        }

        if (!isVisible(submitBtn)) return;

        markStep("3");
        console.log("[BM] Final submit button detected.");

        await waitForEnabled(submitBtn, 15000);
        if (!isRunning()) return;

        if (submitBtn.disabled) {
            console.warn("[BM] Submit button is still disabled.");
            return;
        }

        if (submitBtn.dataset.bmProcessing === "1") return;
        submitBtn.dataset.bmProcessing = "1";

        console.log("[BM] Waiting before final submission...");
        await wait(SUBMIT_WAIT);
        if (!isRunning()) return;

        const targetURL = window.location.origin + "/submit";
        const redirectAt = Date.now() + REDIRECT_WAIT;

        sessionStorage.setItem("bm_redirect_target", targetURL);
        sessionStorage.setItem("bm_redirect_at", String(redirectAt));

        console.log("[BM] Redirect scheduled for:", targetURL);

        setTimeout(() => {
            console.log("[BM] Timer fired - forcing redirect to:", targetURL);
            forceRedirect(targetURL);
        }, REDIRECT_WAIT);

        console.log("[BM] Submitting story...");
        submitBtn.click();

        localStorage.removeItem(STORAGE.CURRENT_URL);
        localStorage.removeItem(STORAGE.CURRENT_TITLE);
        localStorage.removeItem(STORAGE.CURRENT_DESC);
        localStorage.removeItem(STORAGE.STEP);

        const done = incrementDoneCount();
        console.log("[BM] Submission initiated. Redirect will fire in", REDIRECT_WAIT, "ms.");

        if (done >= URLS.length) {
            console.log("[BM] All URLs submitted. Stopping automation.");
            setRunning(false);
            controllerBusy = false;
            setStopButtonDone();
            setRunButtonIdle();
        }

        await wait(REDIRECT_WAIT + 200);
        forceRedirect(targetURL);
    }

    /************************************************************
     * WAIT HELPERS
     ************************************************************/

    function waitForStep(targetStep, timeout) {
        return new Promise(resolve => {
            const start = Date.now();
            const timer = setInterval(() => {
                if (!isRunning()) {
                    clearInterval(timer);
                    resolve(false);
                    return;
                }
                const current = getCurrentStep();
                if (current === targetStep) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
                if (Date.now() - start >= timeout) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 300);
        });
    }

    function waitForEnabled(button, timeout) {
        return new Promise(resolve => {
            const start = Date.now();
            const timer = setInterval(() => {
                if (!isRunning()) {
                    clearInterval(timer);
                    resolve(false);
                    return;
                }
                if (!button.disabled) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
                if (Date.now() - start >= timeout) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 300);
        });
    }

    /************************************************************
     * MAIN CONTROLLER
     ************************************************************/

    let controllerBusy = false;

    async function detectStep() {
        if (!isRunning()) return;
        if (controllerBusy) return;

        const step = getCurrentStep();
        if (!step) {
            console.log("[BM] No active submission step detected.");
            return;
        }

        controllerBusy = true;
        try {
            if (step === 1) await processStep1();
            else if (step === 2) await processStep2();
            else if (step === 3) await processStep3();
        } catch (error) {
            console.error("[BM] Automation error:", error);
        } finally {
            controllerBusy = false;
        }
    }

    /************************************************************
     * BUTTONS
     ************************************************************/

    const BTN_BASE_STYLE = {
        position: "fixed",
        top: "12px",
        zIndex: "2147483647",
        color: "#fff",
        border: "2px solid #fff",
        borderRadius: "6px",
        padding: "8px 14px",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontWeight: "bold",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        letterSpacing: "0.5px"
    };

    function makeButton(id, text, left, color, hoverColor) {
        if (document.getElementById(id)) return null;
        const btn = document.createElement("button");
        btn.id = id;
        btn.textContent = text;
        Object.assign(btn.style, BTN_BASE_STYLE);
        btn.style.left = left;
        btn.style.background = color;

        btn.addEventListener("mouseenter", () => {
            if (!btn.dataset.locked) btn.style.background = hoverColor;
        });
        btn.addEventListener("mouseleave", () => {
            if (!btn.dataset.locked) btn.style.background = color;
        });

        document.body.appendChild(btn);
        return btn;
    }

    function setRunButtonActive() {
        const btn = document.getElementById("bm-run-btn");
        if (!btn) return;
        btn.textContent = "▶ RUNNING";
        btn.style.background = "#1b5e20";
        btn.dataset.locked = "1";
    }

    function setRunButtonIdle() {
        const btn = document.getElementById("bm-run-btn");
        if (!btn) return;
        btn.textContent = "▶ RUN";
        btn.style.background = "#2e7d32";
        delete btn.dataset.locked;
    }

    function setStopButtonDone() {
        const btn = document.getElementById("bm-stop-btn");
        if (!btn) return;
        btn.textContent = "✓ DONE";
        btn.style.background = "#2e7d32";
        btn.dataset.locked = "1";
    }

    function setStopButtonIdle() {
        const btn = document.getElementById("bm-stop-btn");
        if (!btn) return;
        btn.textContent = "■ STOP";
        btn.style.background = "#e53935";
        delete btn.dataset.locked;
    }

    function createButtons() {
        // ▶ RUN
        const runBtn = makeButton("bm-run-btn", "▶ RUN", "12px", "#2e7d32", "#1b5e20");
        if (runBtn) {
            runBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!URLS.length) {
                    alert("No URLs configured. Open SETTINGS and add at least one URL.");
                    return;
                }

                if (isAllDone()) {
                    console.log("[BM] Previous cycle DONE. Auto-reset before RUN...");
                    resetAllProgress();
                    setStopButtonIdle();
                }

                console.log("[BM] RUN button pressed. Automation STARTED.");
                setRunning(true);
                setRunButtonActive();
                detectStep();
            });
        }

        // ■ STOP
        const stopBtn = makeButton("bm-stop-btn", "■ STOP", "110px", "#e53935", "#b71c1c");
        if (stopBtn) {
            stopBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (stopBtn.dataset.locked) return;

                console.log("[BM] STOP button pressed. Automation stopped.");
                setRunning(false);
                controllerBusy = false;
                setRunButtonIdle();

                stopBtn.textContent = "■ STOPPED";
                stopBtn.style.background = "#555";
                setTimeout(() => {
                    if (!stopBtn.dataset.locked) setStopButtonIdle();
                }, 1200);
            });
        }

        // ↺ RESET
        const resetBtn = makeButton("bm-reset-btn", "↺ RESET", "205px", "#1976d2", "#0d47a1");
        if (resetBtn) {
            resetBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const ok = window.confirm(
                    "Reset all rotation progress?\n\n" +
                    "This will:\n" +
                    "• Start again from item #1\n" +
                    "• Clear all current selections\n" +
                    "• Stop the automation\n\n" +
                    "Your saved URL/Title/Desc list stays intact.\n\n" +
                    "Continue?"
                );
                if (!ok) return;

                console.log("[BM] RESET button pressed.");
                setRunning(false);
                controllerBusy = false;
                resetAllProgress();
                setStopButtonIdle();
                setRunButtonIdle();

                resetBtn.textContent = "✓ RESET";
                resetBtn.style.background = "#2e7d32";
                setTimeout(() => {
                    resetBtn.textContent = "↺ RESET";
                    resetBtn.style.background = "#1976d2";
                }, 1200);
            });
        }

        // ⚙ SETTINGS
        const settingsBtn = makeButton("bm-settings-btn", "⚙ SETTINGS", "300px", "#6a1b9a", "#4a148c");
        if (settingsBtn) {
            settingsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSettingsPanel();
            });
        }

        // ✓ FORCE DONE!
        const forceDoneBtn = makeButton("bm-forcedone-btn", "✓ FORCE DONE!", "415px", "#00897b", "#00695c");
        if (forceDoneBtn) {
            forceDoneBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                forceDone();

                forceDoneBtn.textContent = "✓ DONE!";
                forceDoneBtn.style.background = "#2e7d32";
                setTimeout(() => {
                    forceDoneBtn.textContent = "✓ FORCE DONE!";
                    forceDoneBtn.style.background = "#00897b";
                }, 1500);
            });
        }
    }

    /************************************************************
     * SETTINGS PANEL
     ************************************************************/

    function openSettingsPanel() {
        if (document.getElementById("bm-settings-panel")) return;

        const panel = document.createElement("div");
        panel.id = "bm-settings-panel";

        Object.assign(panel.style, {
            position: "fixed",
            top: "60px",
            left: "12px",
            width: "620px",
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            background: "#1e1e1e",
            color: "#eee",
            border: "2px solid #6a1b9a",
            borderRadius: "10px",
            padding: "14px 16px",
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
            zIndex: "2147483647",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
        });

        const title = document.createElement("div");
        title.textContent = "⚙ Bookmarking Master — Settings";
        Object.assign(title.style, {
            fontSize: "16px",
            fontWeight: "bold",
            color: "#ce93d8",
            marginBottom: "10px"
        });
        panel.appendChild(title);

        const hint = document.createElement("div");
        hint.innerHTML = "One item per line. <b>URLs / Titles / Descriptions</b> rotate by position (line 1 ↔ line 1 ↔ line 1).<br>" +
            "<span style='color:#f9a825'>⭐ SAVE AS DEFAULT</span> and <span style='color:#81d4fa'>📥 USE SAVED DEFAULT</span> work across ALL sites.";
        Object.assign(hint.style, {
            fontSize: "12px",
            color: "#aaa",
            marginBottom: "10px"
        });
        panel.appendChild(hint);

        function makeLabel(txt) {
            const l = document.createElement("div");
            l.textContent = txt;
            Object.assign(l.style, {
                marginTop: "8px",
                marginBottom: "4px",
                fontWeight: "bold",
                color: "#90caf9"
            });
            return l;
        }

        function makeTextarea(value, rows) {
            const ta = document.createElement("textarea");
            ta.value = value;
            Object.assign(ta.style, {
                width: "100%",
                minHeight: (rows * 18) + "px",
                background: "#121212",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: "6px",
                padding: "6px 8px",
                fontFamily: "Consolas, monospace",
                fontSize: "12px",
                boxSizing: "border-box",
                resize: "vertical"
            });
            return ta;
        }

        // URLs
        panel.appendChild(makeLabel("URLs (one per line) — current: " + URLS.length));
        const urlsTa = makeTextarea(URLS.join("\n"), 6);
        panel.appendChild(urlsTa);

        // Titles
        panel.appendChild(makeLabel("Titles (one per line) — current: " + TITLES.length));
        const titlesTa = makeTextarea(TITLES.join("\n"), 6);
        panel.appendChild(titlesTa);

        // Descriptions
        panel.appendChild(makeLabel("Descriptions (one per line) — current: " + DESCRIPTIONS.length));
        const descTa = makeTextarea(DESCRIPTIONS.join("\n"), 6);
        panel.appendChild(descTa);

        // Tags
        panel.appendChild(makeLabel("Tags (single line)"));
        const tagsTa = makeTextarea(TAGS, 1);
        tagsTa.style.minHeight = "34px";
        panel.appendChild(tagsTa);

        // Status line
        const status = document.createElement("div");
        Object.assign(status.style, {
            marginTop: "10px",
            fontSize: "12px",
            color: "#ffcc80",
            minHeight: "16px"
        });
        panel.appendChild(status);

        // Button row
        const row = document.createElement("div");
        Object.assign(row.style, {
            marginTop: "12px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap"
        });

        function makeSmallBtn(txt, color, hover) {
            const b = document.createElement("button");
            b.textContent = txt;
            Object.assign(b.style, {
                padding: "8px 14px",
                background: color,
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px"
            });
            b.addEventListener("mouseenter", () => { b.style.background = hover; });
            b.addEventListener("mouseleave", () => { b.style.background = color; });
            return b;
        }

        const saveBtn = makeSmallBtn("💾 SAVE & RESET", "#2e7d32", "#1b5e20");
        const saveAsDefaultBtn = makeSmallBtn("⭐ SAVE AS DEFAULT", "#f9a825", "#c17900");
        const useSavedDefaultBtn = makeSmallBtn("📥 USE SAVED DEFAULT", "#0277bd", "#01579b");
        const clearSavedDefaultBtn = makeSmallBtn("🗑 CLEAR SAVED DEFAULT", "#5d4037", "#3e2723");
        const restoreBtn = makeSmallBtn("↺ RESTORE DEFAULTS", "#c62828", "#8e0000");
        const cancelBtn = makeSmallBtn("✖ CLOSE", "#555", "#333");

        row.appendChild(saveBtn);
        row.appendChild(saveAsDefaultBtn);
        row.appendChild(useSavedDefaultBtn);
        row.appendChild(clearSavedDefaultBtn);
        row.appendChild(restoreBtn);
        row.appendChild(cancelBtn);
        panel.appendChild(row);

        // Actions
        cancelBtn.addEventListener("click", () => {
            panel.remove();
        });

        restoreBtn.addEventListener("click", () => {
            const ok = window.confirm("Restore hardcoded default URL/Title/Description/Tag list for THIS site?");
            if (!ok) return;
            clearConfig();
            urlsTa.value = URLS.join("\n");
            titlesTa.value = TITLES.join("\n");
            descTa.value = DESCRIPTIONS.join("\n");
            tagsTa.value = TAGS;
            status.textContent = "✅ Built-in defaults restored. Click SAVE & RESET to apply.";
            status.style.color = "#a5d6a7";
        });

        saveBtn.addEventListener("click", () => {
            const urlsArr = urlsTa.value.split("\n").map(s => s.trim()).filter(Boolean);
            const titlesArr = titlesTa.value.split("\n").map(s => s.trim()).filter(Boolean);
            const descsArr = descTa.value.split("\n").map(s => s.trim()).filter(Boolean);
            const tagsStr = tagsTa.value.trim();

            if (!urlsArr.length) {
                status.textContent = "❌ At least one URL is required.";
                status.style.color = "#ef9a9a";
                return;
            }

            const warnParts = [];
            if (titlesArr.length !== urlsArr.length) {
                warnParts.push("Titles(" + titlesArr.length + ") ≠ URLs(" + urlsArr.length + ")");
            }
            if (descsArr.length !== urlsArr.length) {
                warnParts.push("Descriptions(" + descsArr.length + ") ≠ URLs(" + urlsArr.length + ")");
            }
            if (warnParts.length) {
                const ok = window.confirm(
                    "Count mismatch:\n• " + warnParts.join("\n• ") +
                    "\n\nItems will still rotate by index (extra items cycle, missing ones wrap)." +
                    "\n\nSave anyway?"
                );
                if (!ok) return;
            }

            saveConfig(urlsArr, titlesArr, descsArr, tagsStr);

            resetAllProgress();
            setStopButtonIdle();
            setRunButtonIdle();

            status.textContent = "✅ Saved for THIS site. Rotation reset. Press ▶ RUN to start.";
            status.style.color = "#a5d6a7";

            panel.querySelectorAll("div").forEach(d => {
                if (d.textContent && d.textContent.startsWith("URLs (")) {
                    d.textContent = "URLs (one per line) — current: " + urlsArr.length;
                }
                if (d.textContent && d.textContent.startsWith("Titles (")) {
                    d.textContent = "Titles (one per line) — current: " + titlesArr.length;
                }
                if (d.textContent && d.textContent.startsWith("Descriptions (")) {
                    d.textContent = "Descriptions (one per line) — current: " + descsArr.length;
                }
            });

            console.log("[BM] Settings saved (per-site). URLs:", urlsArr.length,
                        "Titles:", titlesArr.length,
                        "Descs:", descsArr.length);
        });

        // ⭐ SAVE AS DEFAULT — CROSS-SITE via GM_* storage
        saveAsDefaultBtn.addEventListener("click", () => {
            const urlsArr = urlsTa.value.split("\n").map(s => s.trim()).filter(Boolean);
            const titlesArr = titlesTa.value.split("\n").map(s => s.trim()).filter(Boolean);
            const descsArr = descTa.value.split("\n").map(s => s.trim()).filter(Boolean);
            const tagsStr = tagsTa.value.trim();

            if (!urlsArr.length) {
                status.textContent = "❌ At least one URL is required to save as default.";
                status.style.color = "#ef9a9a";
                return;
            }

            const ok = window.confirm(
                "Save current content as your CROSS-SITE DEFAULT preset?\n\n" +
                "This preset is shared across ALL sites matched by this script.\n" +
                "You can load it on any other site with \"📥 USE SAVED DEFAULT\"."
            );
            if (!ok) return;

            saveAsDefault(urlsArr, titlesArr, descsArr, tagsStr);

            status.textContent = "⭐ Saved as CROSS-SITE DEFAULT: " +
                urlsArr.length + " URLs, " +
                titlesArr.length + " Titles, " +
                descsArr.length + " Descs, Tags: \"" + tagsStr + "\".";
            status.style.color = "#ffe082";
        });

        // 📥 USE SAVED DEFAULT — CROSS-SITE via GM_* storage
        useSavedDefaultBtn.addEventListener("click", () => {
            const def = loadSavedDefault();
            if (!def) {
                status.textContent = "❌ No cross-site saved default found. Use ⭐ SAVE AS DEFAULT first.";
                status.style.color = "#ef9a9a";
                return;
            }

            urlsTa.value = def.urls.join("\n");
            titlesTa.value = def.titles.join("\n");
            descTa.value = def.descs.join("\n");
            tagsTa.value = def.tags;

            status.textContent = "📥 Loaded CROSS-SITE default. Click 💾 SAVE & RESET to apply it for THIS site.";
            status.style.color = "#81d4fa";

            panel.querySelectorAll("div").forEach(d => {
                if (d.textContent && d.textContent.startsWith("URLs (")) {
                    d.textContent = "URLs (one per line) — current: " + def.urls.length;
                }
                if (d.textContent && d.textContent.startsWith("Titles (")) {
                    d.textContent = "Titles (one per line) — current: " + def.titles.length;
                }
                if (d.textContent && d.textContent.startsWith("Descriptions (")) {
                    d.textContent = "Descriptions (one per line) — current: " + def.descs.length;
                }
            });
        });

        // 🗑 CLEAR SAVED DEFAULT — wipe cross-site preset
        clearSavedDefaultBtn.addEventListener("click", () => {
            if (!hasSavedDefault()) {
                status.textContent = "ℹ No cross-site saved default to clear.";
                status.style.color = "#ffe082";
                return;
            }
            const ok = window.confirm(
                "Delete the CROSS-SITE SAVED DEFAULT preset?\n\n" +
                "This does NOT affect this site's working config.\n" +
                "This cannot be undone."
            );
            if (!ok) return;

            clearSavedDefault();
            status.textContent = "🗑 Cross-site saved default cleared.";
            status.style.color = "#ef9a9a";
        });

        document.body.appendChild(panel);
    }

    /************************************************************
     * KEYBOARD CONTROLS
     ************************************************************/

    document.addEventListener(
        "keydown",
        function (event) {
            const tag = (event.target && event.target.tagName) || "";
            const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

            if (event.ctrlKey && event.key.toLowerCase() === "b" && !inField) {
                event.preventDefault();
                event.stopPropagation();

                if (!URLS.length) {
                    alert("No URLs configured. Open SETTINGS and add at least one URL.");
                    return;
                }

                if (isAllDone()) {
                    console.log("[BM] Auto-reset before Ctrl+B start...");
                    resetAllProgress();
                    setStopButtonIdle();
                }

                console.log("[BM] Automation STARTED (Ctrl+B)");
                setRunning(true);
                setRunButtonActive();
                detectStep();
            }

            if (event.ctrlKey && event.key === "Escape" && !inField) {
                event.preventDefault();
                event.stopPropagation();
                console.log("[BM] Automation STOPPED (Ctrl+Esc)");
                setRunning(false);
                controllerBusy = false;
                setRunButtonIdle();
            }
        },
        true
    );

    /************************************************************
     * INIT
     ************************************************************/

    function initUI() {
        if (document.body) {
            createButtons();

            if (isAllDone()) {
                setStopButtonDone();
                setRunButtonIdle();
            } else if (isRunning()) {
                setRunButtonActive();
            } else {
                setStopButtonIdle();
                setRunButtonIdle();
            }
        } else {
            setTimeout(initUI, 300);
        }
    }

    setTimeout(() => {
        initUI();

        if (isRunning()) {
            console.log("[BM] Automation was already running.");
            detectStep();
        }
    }, 1000);

    setInterval(() => {
        if (!isRunning()) return;
        detectStep();
    }, CHECK_INTERVAL);

    console.log("[BM] Bookmarking Master V8.2 loaded. Cross-site default:",
        hasSavedDefault() ? "YES" : "NO");
})();