/* ============================================================
   DIMITENT — Main JS
   Navbar | Mobile menu | Smooth scroll | Counters | Reveal
   ============================================================ */

(function () {
    'use strict';

    /* ----- NAVBAR SCROLL ----- */
    const navbar = document.getElementById('navbar');

    function handleNavbarScroll() {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    handleNavbarScroll();


    /* ----- MOBILE HAMBURGER ----- */
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');

    hamburger.addEventListener('click', function () {
        const isOpen = navLinks.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('.nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
            navLinks.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (!navbar.contains(e.target)) {
            navLinks.classList.remove('open');
            hamburger.classList.remove('open');
        }
    });


    /* ----- SMOOTH SCROLL ----- */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();

            const navH = parseInt(
                getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
            ) || 72;

            const top = target.getBoundingClientRect().top + window.scrollY - navH;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });


    /* ----- ACTIVE NAV LINK ON SCROLL ----- */
    const sections = document.querySelectorAll('section[id]');

    function updateActiveNav() {
        const scrollPos = window.scrollY + 100;
        sections.forEach(function (section) {
            const top    = section.offsetTop;
            const bottom = top + section.offsetHeight;
            const id     = section.getAttribute('id');
            const link   = document.querySelector('.nav-link[href="#' + id + '"]');
            if (!link) return;

            if (scrollPos >= top && scrollPos < bottom) {
                document.querySelectorAll('.nav-link').forEach(function (l) {
                    l.style.color = '';
                });
                link.style.color = '#FFC72C';
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });


    /* ----- COUNTER ANIMATION ----- */
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function animateCounter(el, target, duration) {
        duration = duration || 2000;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress  = Math.min((timestamp - startTime) / duration, 1);
            var easedVal  = easeOutCubic(progress);
            el.textContent = Math.floor(easedVal * target);
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target;
        }

        requestAnimationFrame(step);
    }

    var counterEls      = document.querySelectorAll('.stat-num');
    var countersStarted = false;

    var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !countersStarted) {
                countersStarted = true;
                counterEls.forEach(function (el) {
                    var target = parseInt(el.getAttribute('data-target'), 10);
                    animateCounter(el, target, 1800);
                });
            }
        });
    }, { threshold: 0.5 });

    if (counterEls.length) {
        counterObserver.observe(counterEls[0]);
    }


    /* ----- SCROLL REVEAL ----- */
    var revealEls = [
        '.service-card',
        '.why-card',
        '.gallery-item',
        '.section-header',
        '.about-grid',
        '.contact-grid',
        '.gallery-cta'
    ];

    var allReveal = document.querySelectorAll(revealEls.join(', '));

    allReveal.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = ((i % 4) * 80) + 'ms';
    });

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    allReveal.forEach(function (el) { revealObserver.observe(el); });


    /* ----- CONTACT FORM ----- */
    // Το αίτημα φεύγει στο info@dimitent.gr μέσω του δικού μας serverless function
    // (api/contact.js), που στέλνει με το SMTP του ίδιου του domain. Χωρίς τρίτους.
    var FORM_ENDPOINT = '/api/contact';
    var BTN_IDLE      = '<i class="fas fa-paper-plane"></i> ΑΠΟΣΤΟΛΗ ΑΙΤΗΜΑΤΟΣ';

    var contactForm = document.getElementById('contactForm');
    var submitBtn   = document.getElementById('submitBtn');
    var formStatus  = document.getElementById('formStatus');

    function setStatus(msg, kind) {
        if (!formStatus) return;
        formStatus.textContent = msg || '';
        formStatus.className   = 'form-status' + (kind ? ' ' + kind : '');
    }

    function resetBtn() {
        submitBtn.innerHTML = BTN_IDLE;
        submitBtn.classList.remove('success');
        submitBtn.disabled  = false;
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Basic validation
            var name  = contactForm.querySelector('#name').value.trim();
            var phone = contactForm.querySelector('#phone').value.trim();

            if (!name || !phone) {
                shakeBtn();
                setStatus('Συμπληρώστε ονοματεπώνυμο και τηλέφωνο.', 'error');
                return;
            }

            var serviceSel = contactForm.querySelector('#service');
            var service    = serviceSel.selectedIndex > 0
                ? serviceSel.options[serviceSel.selectedIndex].text
                : '—';

            var payload = {
                name:    name,
                phone:   phone,
                email:   contactForm.querySelector('#email').value.trim(),
                service: service,
                message: contactForm.querySelector('#message').value.trim(),
                website: contactForm.querySelector('#website').value  // honeypot, μένει κενό
            };

            // Sending state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ΑΠΟΣΤΟΛΗ...';
            submitBtn.disabled  = true;
            setStatus('');

            fetch(FORM_ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body:    JSON.stringify(payload)
            })
            .then(function (res) {
                return res.json()
                    .catch(function () { return {}; })
                    .then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
            })
            .then(function (r) {
                if (!r.ok || r.data.ok !== true) {
                    throw new Error((r.data && r.data.error) || ('HTTP ' + r.status));
                }

                // Success state
                submitBtn.innerHTML = '<i class="fas fa-check"></i> ΕΣΤΑΛΗ!';
                submitBtn.classList.add('success');
                setStatus('Το αίτημά σας εστάλη. Θα επικοινωνήσουμε σύντομα μαζί σας.', 'success');
                contactForm.reset();

                setTimeout(function () {
                    resetBtn();
                    setStatus('');
                }, 5000);
            })
            .catch(function (err) {
                // Ο ακριβής λόγος φαίνεται στην κονσόλα (F12) για διάγνωση.
                console.warn('[DIMITENT] Αποτυχία αποστολής φόρμας:', err && err.message);
                resetBtn();
                shakeBtn();
                setStatus('Η αποστολή απέτυχε. Καλέστε μας στο 2310 754.874 ή στείλτε email στο info@dimitent.gr.', 'error');
            });
        });
    }

    function shakeBtn() {
        submitBtn.style.animation = 'shake 0.4s ease';
        setTimeout(function () { submitBtn.style.animation = ''; }, 400);
    }


    /* ----- GALLERY HOVER RIPPLE ----- */
    document.querySelectorAll('.gallery-card').forEach(function (card) {
        card.addEventListener('mouseenter', function () {
            card.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s cubic-bezier(0.4,0,0.2,1)';
        });
    });


    /* ----- HERO SLIDESHOW ----- */
    var heroImages = [
        'brand_assets/slide3.png.jpg',
        'brand_assets/slide4.png.jpg',
        'brand_assets/slide5.png.jpg',
        'brand_assets/slide6.png.jpg',
        'brand_assets/slide8.png.jpg',
        'brand_assets/slide9.png.jpg',
        'brand_assets/slide10.png.jpg',
        'brand_assets/slide11.png.jpg',
        'brand_assets/slide12.png.jpg',
        'brand_assets/slide13.png.jpg'
    ];

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function preloadImage(src, callback) {
        var img = new Image();
        img.onload  = function () { callback(true); };
        img.onerror = function () { callback(false); };
        img.src = src;
    }

    var heroBg       = document.getElementById('heroBg');
    var slideEls     = [];
    var slideIndex   = 0;
    var slideInterval = null;

    function buildSlideshow(validImages) {
        if (!validImages.length) return;

        var overlay = heroBg.querySelector('.hero-overlay');

        validImages.forEach(function (src) {
            var div = document.createElement('div');
            div.className = 'hero-slide';
            div.style.backgroundImage = 'url("' + src + '")';
            heroBg.insertBefore(div, overlay);
            slideEls.push(div);
        });

        slideEls[0].classList.add('active');

        slideInterval = setInterval(function () {
            slideEls[slideIndex].classList.remove('active');
            slideIndex = (slideIndex + 1) % slideEls.length;
            slideEls[slideIndex].classList.add('active');
        }, 5500);
    }

    (function initSlideshow() {
        var shuffled = shuffleArray(heroImages);
        var valid    = [];
        var checked  = 0;

        shuffled.forEach(function (src) {
            preloadImage(src, function (ok) {
                if (ok) valid.push(src);
                checked++;
                if (checked === shuffled.length) {
                    buildSlideshow(valid);
                }
            });
        });
    })();

})();
