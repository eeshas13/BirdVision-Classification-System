document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const browseButton = document.getElementById('browseButton');
  const previewWrap = document.getElementById('imagePreviewWrap');
  const previewImage = document.getElementById('imagePreview');
  const fileName = document.getElementById('fileName');
  const removeBtn = document.getElementById('removeImage');
  const analyzeButton = document.getElementById('analyzeButton');
  const uploadInner = document.getElementById('uploadInner');
  const birdSearch = document.getElementById('birdSearch');
  const birdGrid = document.getElementById('birdGrid');

  if (dropZone && imageInput) {
    const triggerPicker = () => imageInput.click();

    browseButton?.addEventListener('click', triggerPicker);
    dropZone.addEventListener('click', (event) => {
      if (event.target !== removeBtn) {
        triggerPicker();
      }
    });

    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragover');
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        const file = event.dataTransfer.files[0];
        imageInput.files = event.dataTransfer.files;
        showPreview(file);
      }
    });

    imageInput.addEventListener('change', () => {
      const file = imageInput.files && imageInput.files[0];
      if (file) {
        showPreview(file);
      }
    });

    function showPreview(file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type) && !/\.(jpg|jpeg|png)$/i.test(file.name)) {
        alert('Please upload a valid JPG, JPEG, or PNG file.');
        imageInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        previewImage.src = event.target.result;
        previewWrap.classList.remove('hidden');
        uploadInner.classList.add('hidden');
        fileName.textContent = file.name;
      };
      reader.readAsDataURL(file);
    }

    removeBtn?.addEventListener('click', () => {
      imageInput.value = '';
      previewWrap.classList.add('hidden');
      uploadInner.classList.remove('hidden');
      fileName.textContent = 'No file selected';
    });
  }

  if (analyzeButton) {
    analyzeButton.closest('form')?.addEventListener('submit', () => {
      if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        alert('Please choose an image before analyzing.');
        return false;
      }
      analyzeButton.classList.add('loading');
      analyzeButton.textContent = 'Analyzing bird image...';
      analyzeButton.disabled = true;
    });
  }

  if (birdSearch && birdGrid) {
    birdSearch.addEventListener('input', () => {
      const query = birdSearch.value.toLowerCase().trim();
      const cards = birdGrid.querySelectorAll('.bird-card');

      cards.forEach((card) => {
        const name = (card.dataset.name || '').toLowerCase();
        const scientific = (card.dataset.scientific || '').toLowerCase();
        const matches = name.includes(query) || scientific.includes(query);
        card.style.display = matches ? 'block' : 'none';
      });
    });
  }
});
