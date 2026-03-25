document.addEventListener('DOMContentLoaded', () => {
  const calendar = new SimpleCalendarJs('#kalenteri', {
    defaultView: 'month',
    locale: 'fi-FI',
    fetchEvents: async () => {
      try {
        const res = await fetch('/api/tilaukset');
        console.log('Tilaukset noudettu /api/tilaukset', res);
        const events = await res.json();

      return events
      } catch {
        return [];
      }
    },

    onEventClick: async (event) => {
      console.log(`Event clicked:`, event);
      // Lähetä api kysely --> näytä tapahtuman tarkemmat tiedot "tilaukset" osiossa.
      try {

        const res = await fetch(`/api/tilaukset/${event.id}`);
        console.log(`Response status:`, res.status);

        if (!res.ok) {
          throw new Error('Tapahtumaa ei saatu ladattua');
        }
        const data = await res.json();
        renderEventDetails(data);

      } catch (err) {
        console.error(err);
      }

      // VANHA POISTOTOIMINTO
      /*  
      if (confirm("Poistetaanko varaus?")) {
        fetch("/api/delete-event/" + event.id, { method: "DELETE" })
          .then(() => location.reload());
      }
          */
    },

    onSlotClick: (date) => { 
      const vuosi = date.getFullYear()
      const kuukausi = date.getMonth()
      // Joku locale bugi --> korjaus
      const päivä = date.getDate()+1
      const today = new Date(vuosi,kuukausi,päivä).toISOString().split('T')[0];
      lisääTilausModaali.showModal();
      lisääTilausFormi.reset();
      console.log(today);
      lisääTilausAloitusPäivä.value = today;
      lisääTilausLopetusPäivä.value = today;
      lisääTilausLopetusPäivä.min = today;
    }
  });
});

function renderEventDetails(event) {
  console.log(event);
  const div = document.getElementById('tilaukset');
  document.getElementById('tilaus-alkupvm').textContent = event.vuokra_alku;
  document.getElementById('tilaus-loppupvm').textContent = event.vuokra_loppu;
  document.getElementById('tilaus-asiakas').textContent = event.asiakas_nimi;
  document.getElementById('tilaus-tiedot').textContent = JSON.stringify({
    tilaus_id: event.tilaus_id,
    asiakas_id: event.asiakas_id,
    timestamp: event.luotu
  }, null, 2);
  div.dataset.tilaus_id = event.tilaus_id;
}

/* TESTIVARAUS (nyt turha?)
async function addTest() {
  const res = await fetch('/api/add-test', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      asiakas_id: 1,
      vuokra_alku: new Date().toISOString().split('T')[0],
      vuokra_loppu: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    })
  });

  const data = await res.json();
  if (data.success) location.reload();
}
*/

/* LISÄÄ ASIAKAS
addCustomerBtn.onclick = () => customerModal.style.display = "flex";
function closeCustomerModal() { customerModal.style.display = "none"; }

saveCustomer.onclick = async () => {
  await fetch("/api/asiakkaat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      nimi: custName.value,
      puhelin: custPhone.value,
      osoite: custAddress.value
    })
  });
  closeCustomerModal();
  alert("Asiakas lisätty!");
};

// LISÄÄ KATEGORIA
addCategoryBtn.onclick = () => categoryModal.style.display = "flex";
function closeCategoryModal() { categoryModal.style.display = "none"; }

saveCategory.onclick = async () => {
  await fetch("/api/liinakategoriat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ nimi: catName.value })
  });
  closeCategoryModal();
  alert("Kategoria lisätty!");
};

// LISÄÄ KOKO
addSizeBtn.onclick = () => sizeModal.style.display = "flex";
function closeSizeModal() { sizeModal.style.display = "none"; }

saveSize.onclick = async () => {
  await fetch("/api/liinakoot", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ koko_nimi: sizeName.value })
  });
  closeSizeModal();
  alert("Koko lisätty!");
};
*/

// LISÄÄ TILAUS POPUP
const lisääTilausNappi = document.getElementById("lisääTilausNappi");
const lisääTilausModaali = document.getElementById("lisääTilausModaali")
const lisääTilausFormi = document.getElementById("tilausFormi")
const lisääTilausAloitusPäivä = document.getElementById("aloituspäivä")
const lisääTilausLopetusPäivä = document.getElementById("lopetuspäivä")

lisääTilausAloitusPäivä.addEventListener('focusout', () => {
  if (lisääTilausAloitusPäivä.value < lisääTilausLopetusPäivä.value) {
    lisääTilausLopetusPäivä.value = lisääTilausAloitusPäivä.value
  }
  lisääTilausLopetusPäivä.min = lisääTilausAloitusPäivä.value;
})

lisääTilausNappi.addEventListener('click', () => {
  const today = new Date().toISOString().split('T')[0];
  lisääTilausModaali.showModal();
  lisääTilausFormi.reset();
  lisääTilausAloitusPäivä.value = today;
  lisääTilausLopetusPäivä.value = today;
  lisääTilausLopetusPäivä.min = today;
});

lisääTilausFormi.addEventListener('submit', function(e) {
  const data = new FormData(lisääTilausFormi);
  const arvot = Object.fromEntries(data);
  lisääTilaus(arvot);
  // debug
  console.log(`lisääTilausFormi "Lähetä":`);
  console.log(arvot)
})

// Tietojen lähetys apiin.
async function lisääTilaus(arvot) {
  const res = await fetch('/api/tilaukset', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      asiakas_nimi: arvot.asiakas,
      vuokra_alku: arvot.aloituspäivä,
      vuokra_loppu: arvot.lopetuspäivä
    })
  });

  const data = await res.json();
  if (data.success) location.reload();
}

// Tilauksen poistonappi
const poistaTilausNappi = document.getElementById('poistaTilausNappi');
poistaTilausNappi.addEventListener('click', () => {
  const event = document.getElementById('tilaukset').dataset.tilaus_id;
  console.log(`Poistetaan tilaus`, event);

  

  if (confirm("Poistetaanko varaus?")) {
    fetch(`/api/delete-event/${event}`, { method: "DELETE" })
      .then(() => location.reload());
  }

});
