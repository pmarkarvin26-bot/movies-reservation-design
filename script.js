/* script.js
   Handles:
   - seat rendering & selection (reservation page)
   - reading URL params to populate reservation header
   - simple Movies page filtering & search
   - loyalty registration mock and dashboard rendering
   - contact/reservation form basic validation
   - Notes included where to plug into a back-end
*/

/* ---------- Utilities ---------- */
const qs = (selector, parent=document) => parent.querySelector(selector);
const qsa = (selector, parent=document) => Array.from(parent.querySelectorAll(selector));

/* ---------- Common: mobile nav toggle ---------- */
document.addEventListener('click', (e)=>{
  if (e.target.matches('.mobile-menu-btn') || e.target.closest('.mobile-menu-btn')){
    document.body.classList.toggle('nav-open');
    const btn = document.querySelector('.mobile-menu-btn');
    btn.setAttribute('aria-expanded', document.body.classList.contains('nav-open'));
  }
});

/* ---------- Parse URL params helper ---------- */
function getUrlParams(){
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());
}

/* ---------- MOVIES PAGE: Simple search & filter ---------- */
function initMoviesPage(){
  const movies = [
    // sample dataset; in production fetch from API
    {id:'m1',title:'Azure Skies',genre:'Drama',rating:'PG-13',duration:118,poster:'https://picsum.photos/seed/1/400/600',comingSoon:false,showtimes:['2025-10-08T14:00','2025-10-08T18:30','2025-10-09T20:00']},
    {id:'m2',title:'Neon Chase',genre:'Action',rating:'R',duration:102,poster:'https://picsum.photos/seed/2/400/600',comingSoon:false,showtimes:['2025-10-08T12:00','2025-10-08T16:15']},
    {id:'m3',title:'The Quiet Harbor',genre:'Romance',rating:'PG',duration:95,poster:'https://picsum.photos/seed/3/400/600',comingSoon:true,showtimes:[]},
    {id:'m4',title:'Galactic Drift',genre:'Sci-Fi',rating:'PG-13',duration:137,poster:'https://picsum.photos/seed/4/400/600',comingSoon:false,showtimes:['2025-10-08T19:30','2025-10-09T21:00']},
    // add more...
  ];

  // render function
  const grid = qs('#movies-grid');
  function render(list){
    grid.innerHTML = '';
    list.forEach(m=>{
      const card = document.createElement('article');
      card.className = 'movie-card';
      card.innerHTML = `
        <img class="poster" src="${m.poster}" alt="${m.title} poster" />
        <div class="movie-meta">
          <h3>${m.title}</h3>
          <div class="meta-row"><span>${m.genre}</span> · <span>${m.rating}</span> · <span>${m.duration} min</span></div>
          <p class="hint" style="margin-top:8px">${m.comingSoon ? 'Coming soon — add to watchlist' : 'Now Showing'}</p>
          <div class="showtimes" aria-hidden="${m.comingSoon}">
            ${m.showtimes.map(st=>{
              // show a friendly label and link to reservation.html with params
              const timeLabel = new Date(st).toLocaleString();
              return `<button class="showtime-btn" data-movie-id="${m.id}" data-movie-title="${encodeURIComponent(m.title)}" data-time="${st}" aria-label="Book ${m.title} at ${timeLabel}">${new Date(st).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</button>`;
            }).join('')}
          </div>
          <div style="margin-top:10px">
            ${m.comingSoon ? `<button class="btn secondary add-watchlist" data-id="${m.id}">Add to Watchlist</button>` : `<button class="btn book-now" data-id="${m.id}" data-title="${encodeURIComponent(m.title)}">Book Now</button>`}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  render(movies);

  // search/filter logic
  const searchInput = qs('#movie-search');
  const genreSelect = qs('#filter-genre');
  const ratingSelect = qs('#filter-rating');
  const dateInput = qs('#filter-date');

  function filterAndRender(){
    const q = searchInput.value.trim().toLowerCase();
    const g = genreSelect.value;
    const r = ratingSelect.value;
    const d = dateInput.value;

    let result = movies.filter(m=>{
      if (g && m.genre !== g) return false;
      if (r && m.rating !== r) return false;
      if (q && !m.title.toLowerCase().includes(q) && !m.genre.toLowerCase().includes(q)) return false;
      if (d && m.showtimes.length){
        // keep if any showtime matches the date
        const match = m.showtimes.some(st => st.startsWith(d));
        if (!match) return false;
      }
      return true;
    });
    render(result);
  }

  [searchInput, genreSelect, ratingSelect, dateInput].forEach(el => el && el.addEventListener('input', filterAndRender));

  // event delegation for showtime & book buttons
  grid.addEventListener('click', (e)=>{
    const stBtn = e.target.closest('.showtime-btn');
    if (stBtn){
      const movieTitle = decodeURIComponent(stBtn.dataset.movieTitle || '');
      const time = stBtn.dataset.time;
      // navigate to reservation page with params
      const url = new URL('reservation.html', window.location.href);
      url.searchParams.set('movie', movieTitle);
      url.searchParams.set('time', time);
      window.location.href = url.toString();
    }
    const bookBtn = e.target.closest('.book-now');
    if (bookBtn){
      const title = decodeURIComponent(bookBtn.dataset.title || '');
      const url = new URL('reservation.html', window.location.href);
      url.searchParams.set('movie', title);
      // default to next showtime in dataset; for demo pick now
      url.searchParams.set('time', new Date().toISOString());
      window.location.href = url.toString();
    }
    const watchBtn = e.target.closest('.add-watchlist');
    if (watchBtn){
      watchBtn.textContent = 'Added ✓';
      watchBtn.disabled = true;
    }
  });
}

/* ---------- RESERVATION PAGE (seat rendering & selection) ---------- */
function initReservationPage(){
  const params = getUrlParams();
  const movieTitle = params.movie ? decodeURIComponent(params.movie) : 'Selected Movie';
  const time = params.time ? new Date(params.time) : new Date();
  const headerTitle = qs('#res-movie-title');
  const headerTime = qs('#res-movie-time');

  if (headerTitle) headerTitle.textContent = movieTitle;
  if (headerTime) headerTime.textContent = time.toLocaleString();

  /* Seat map model
     We'll create rows A-J and columns 1-12 (modify below).
     'bookedSeats' is a mock list; in production you'd request seat availability for the showtime from API.
  */
  const rows = 'ABCDEFGHIJ'.split('');
  const cols = Array.from({length:12}, (_,i)=>i+1); // 1..12
  // demo booked seats - in practice fetch from server
  const bookedSeats = ['A3','A4','B6','C10','D1','E5','F8','G2','H11','J12'];

  const seatGrid = qs('#seat-grid');
  // set CSS grid columns to cols length
  seatGrid.style.gridTemplateColumns = `repeat(${cols.length}, 1fr)`;

  // Price per seat (could be tiered)
  const seatPrice = 220; // PHP or chosen currency

  // render seats
  function renderSeats(){
    seatGrid.innerHTML = '';
    rows.forEach(row=>{
      cols.forEach(col=>{
        const id = `${row}${col}`;
        const btn = document.createElement('button');
        btn.className = 'seat';
        btn.type = 'button';
        btn.dataset.seat = id;
        btn.setAttribute('aria-label', `Seat ${id}`);
        btn.setAttribute('aria-pressed','false');
        btn.innerHTML = `<span class="seat-label">${col}</span>`;
        // identify as booked
        if (bookedSeats.includes(id)){
          btn.classList.add('booked');
          btn.setAttribute('aria-disabled','true');
          btn.innerHTML = `<span class="seat-label">${col}</span>`;
        }
        seatGrid.appendChild(btn);
      });
      // add a break via an empty element to visually separate rows (optional)
      const rowLabel = document.createElement('div');
      rowLabel.style.gridColumn = `1 / span ${cols.length}`;
      rowLabel.style.textAlign = 'left';
      rowLabel.style.margin = '6px 0 12px';
      rowLabel.style.color = 'var(--muted)';
      rowLabel.textContent = `Row ${row}`;
      seatGrid.appendChild(rowLabel);
    });
  }
  renderSeats();

  // selection state
  let selectedSeats = [];

  // update summary
  const selCountEl = qs('#selected-count');
  const selTotalEl = qs('#selected-total');

  function updateSummary(){
    selCountEl.textContent = selectedSeats.length;
    selTotalEl.textContent = (selectedSeats.length * seatPrice).toLocaleString();
  }

  // seat click handling
  seatGrid.addEventListener('click', (e)=>{
    const seat = e.target.closest('.seat');
    if (!seat) return;
    if (seat.classList.contains('booked')) return;
    const id = seat.dataset.seat;
    const pressed = seat.getAttribute('aria-pressed') === 'true';
    if (!pressed){
      // select
      seat.setAttribute('aria-pressed','true');
      selectedSeats.push(id);
    } else {
      // deselect
      seat.setAttribute('aria-pressed','false');
      selectedSeats = selectedSeats.filter(x=>x!==id);
    }
    updateSummary();
  });

  updateSummary();

  // Confirm reservation button with front-end validation
  const confirmBtn = qs('#confirm-reservation');
  confirmBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const name = qs('#res-name').value.trim();
    const email = qs('#res-email').value.trim();
    const loyalty = qs('#res-loyalty').value.trim();

    // basic validation
    if (!name){ alert('Please enter your name.'); qs('#res-name').focus(); return; }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)){ alert('Please enter a valid email address.'); qs('#res-email').focus(); return; }
    if (selectedSeats.length === 0){ alert('Please select at least one seat.'); return; }

    // Mock confirmation (in real app send to server here)
    const reservation = {
      movie: movieTitle,
      time: time.toISOString(),
      seats: selectedSeats,
      name, email, loyalty,
      total: selectedSeats.length * seatPrice
    };

    // For demo, store in localStorage
    const reservations = JSON.parse(localStorage.getItem('reservations')||'[]');
    reservations.push(reservation);
    localStorage.setItem('reservations', JSON.stringify(reservations));

    // Mark selected seats as booked visually (client-side)
    selectedSeats.forEach(sid=>{
      const seatEl = seatGrid.querySelector(`[data-seat="${sid}"]`);
      if (seatEl){
        seatEl.classList.add('booked');
        seatEl.setAttribute('aria-disabled','true');
        seatEl.setAttribute('aria-pressed','false');
      }
    });

    // clear selection
    selectedSeats = [];
    updateSummary();

    alert('Reservation confirmed! A confirmation email would be sent in a real app.');
    // Optionally redirect to a "success" page
  });

  /* ---------- Notes on back-end integration ----------
     - Instead of using the `bookedSeats` array above, fetch availability for the given movie+time:
         GET /api/shows/{showId}/seats
       Response should include: [{seatId: "A1", status: "available"|"booked"|...}, ...]
     - On Confirm, POST selected seats:
         POST /api/reservations
         {showId, seats:["A1","B2"], customer:{name,email,loyalty}}
       Server performs atomic seat reservation and returns success/failure per seat.
     - When server returns success, update UI to .booked seats and show confirmation ID.
  */
}

/* ---------- LOYALTY PAGE: registration & mock dashboard ---------- */
function initLoyaltyPage(){
  const form = qs('#loyalty-register');
  const dashboard = qs('#loyalty-dashboard');

  // If a user is stored in localStorage, show dashboard
  function renderDashboard(user){
    if (!dashboard) return;
    dashboard.innerHTML = `
      <div class="loyalty-card">
        <div class="card-mockup">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:0.95rem">Cinema Loyalty</div>
              <div style="font-size:1.4rem">${user.name}</div>
            </div>
            <div style="text-align:right">
              <div class="masked">•••• •••• •••• ${user.cardNumber.slice(-4)}</div>
              <div style="font-size:0.9rem">Tier: ${user.tier}</div>
            </div>
          </div>
          <div style="margin-top:8px; font-size:0.9rem">Points: <strong>${user.points}</strong></div>
        </div>

        <div style="margin-top:10px">
          <h4 style="margin:0 0 6px 0">Recent Rewards</h4>
          <ul>
            ${user.rewards.map(r=>`<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  const saved = JSON.parse(localStorage.getItem('loyaltyUser')||'null');
  if (saved) renderDashboard(saved);

  form && form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = qs('#loyalty-name').value.trim();
    const email = qs('#loyalty-email').value.trim();
    const pwd = qs('#loyalty-password').value.trim();
    if (!name || !email || !pwd){ alert('Please fill all fields'); return; }
    // create mock user
    const user = {
      name, email, cardNumber: 'LC' + Math.floor(100000 + Math.random()*900000),
      points: 200, tier: 'Silver', rewards: ['Free popcorn (100 pts)', '20% off ticket (500 pts)']
    };
    localStorage.setItem('loyaltyUser', JSON.stringify(user));
    renderDashboard(user);
    alert('Loyalty card created — in a real app you would receive an email to verify your account.');
  });

  // redeem mock action
  document.addEventListener('click', (e)=>{
    if (e.target.matches('.redeem-offer')){
      alert('Redeem flow would call the back-end to deduct points and apply the reward.');
    }
  });
}

/* ---------- CONTACT PAGE: simple validation ---------- */
function initContactPage(){
  const contactForm = qs('#contact-form');
  if (!contactForm) return;
  contactForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = qs('#contact-name').value.trim();
    const email = qs('#contact-email').value.trim();
    const message = qs('#contact-message').value.trim();
    if (!name || !email || !message){ alert('Please complete all fields.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)){ alert('Please enter a valid email.'); return; }
    // In production: POST /api/contact {name,email,message}
    alert('Message sent. In a real app the server would respond with confirmation.');
    contactForm.reset();
  });
}

/* ---------- INIT: detect which page and init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const body = document.body;
  if (body.classList.contains('page-movies')) initMoviesPage();
  if (body.classList.contains('page-reservation')) initReservationPage();
  if (body.classList.contains('page-loyalty')) initLoyaltyPage();
  if (body.classList.contains('page-contact')) initContactPage();
});
