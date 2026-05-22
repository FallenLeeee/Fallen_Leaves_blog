class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.mouseRadius = 150;
    this.animId = null;
    this.resize();
    this.init();
    this.bindEvents();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    const count = Math.min(120, Math.floor((this.width * this.height) / 12000));
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    const colors = [
      'rgba(147, 197, 253, ',  // 蓝
      'rgba(255, 200, 120, ',  // 暖橙
      'rgba(180, 220, 255, ',  // 淡蓝
      'rgba(255, 220, 180, ',  // 暖黄
      'rgba(200, 230, 255, ',  // 浅蓝
    ];
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulsePhase: Math.random() * Math.PI * 2
    };
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    });

    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });
  }

  drawParticle(p, time) {
    const pulse = Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.3 + 0.7;
    const currentOpacity = p.opacity * pulse;

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    this.ctx.fillStyle = p.color + currentOpacity + ')';
    this.ctx.fill();

    if (p.size > 1.5) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + (currentOpacity * 0.15) + ')';
      this.ctx.fill();
    }
  }

  drawConnections() {
    const maxDist = 120;
    const maxDistSq = maxDist * maxDist;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const opacity = (1 - dist / maxDist) * 0.1;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(255, 210, 150, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
  }

  drawMouseConnections() {
    for (const p of this.particles) {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouseRadius) {
        const opacity = (1 - dist / this.mouseRadius) * 0.3;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.strokeStyle = `rgba(255, 200, 120, ${opacity})`;
        this.ctx.lineWidth = 0.8;
        this.ctx.stroke();
      }
    }
  }

  update() {
    for (const p of this.particles) {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouseRadius) {
        const force = (this.mouseRadius - dist) / this.mouseRadius * 0.02;
        p.vx += dx * force;
        p.vy += dy * force;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;

      p.x = Math.max(0, Math.min(this.width, p.x));
      p.y = Math.max(0, Math.min(this.height, p.y));
    }
  }

  animate(time) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.update();
    this.drawConnections();
    this.drawMouseConnections();

    for (const p of this.particles) {
      this.drawParticle(p, time);
    }

    this.animId = requestAnimationFrame((t) => this.animate(t));
  }

  start() {
    if (!this.animId) {
      this.animate(0);
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
