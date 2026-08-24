export const demoTranscriptEntries = [
  {
    id: "demo-1422",
    timestamp: "14:22",
    speaker: "Prof. Bell",
    vi: "Các pulsar là những sao neutron quay cực nhanh và phát ra những chùm bức xạ từ các cực từ của chúng.",
    en: "Pulsars are rapidly rotating neutron stars that emit beams of radiation from their magnetic poles.",
    note: null,
  },
  {
    id: "demo-1445",
    timestamp: "14:45",
    speaker: "Dr. Nguyen",
    vi: "Khi một trong hai hạt vướng víu được đo, trạng thái của hạt còn lại có tương quan ngay cả khi chúng ở cách xa nhau.",
    en: "When one of two entangled particles is measured, the state of the other remains correlated even when they are far apart.",
    note: "So sánh cách diễn giải này với phần giải thích trong bài báo nền.",
  },
  {
    id: "demo-1512",
    timestamp: "15:12",
    speaker: "Prof. Bell",
    vi: "Thách thức thực nghiệm là duy trì sự kết hợp lượng tử đủ lâu để truyền thông tin qua khoảng cách có ích.",
    en: "The experimental challenge is maintaining quantum coherence long enough to transmit information across a useful distance.",
    note: null,
  },
  {
    id: "demo-1738",
    timestamp: "17:38",
    speaker: "Prof. Bell",
    vi: "Hamiltonian mô tả tổng năng lượng của hệ và quyết định cách hàm sóng tiến hóa theo thời gian.",
    en: "The Hamiltonian describes the total energy of the system and determines how the wave function evolves over time.",
    note: null,
  },
] as const

export const demoContextDocuments = [
  {
    kind: "Paper",
    title: "Quantum Entanglement Networks",
    description: "Seminar pre-read covering long-distance coherence and measurement constraints.",
    meta: "Primary source · 18 pages",
  },
  {
    kind: "Slides",
    title: "Lecture 04 — Quantum Systems",
    description: "Reference slides for the Hamiltonian, eigenstates, and time evolution.",
    meta: "Reference · 34 slides",
  },
] as const

export const demoTerminology = [
  {
    term: "Hamiltonian",
    vi: "Toán tử Hamilton",
    description: "Toán tử biểu diễn tổng năng lượng của một hệ lượng tử và chi phối sự tiến hóa theo thời gian.",
  },
  {
    term: "Quantum decoherence",
    vi: "Mất kết hợp lượng tử",
    description: "Quá trình hệ lượng tử mất hành vi kết hợp khi tương tác với môi trường xung quanh.",
  },
  {
    term: "Eigenstate",
    vi: "Trạng thái riêng",
    description: "Trạng thái có giá trị xác định đối với một đại lượng quan sát cụ thể.",
  },
] as const
