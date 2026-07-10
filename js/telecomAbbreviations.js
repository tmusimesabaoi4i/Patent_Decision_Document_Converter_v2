// ファイル名: telecomAbbreviations.js
//
// 目的: 通信・3GPP 系略語の置換辞書（純データ、ロジックなし）
// 公開グローバル: root.telecomAbbreviations
// 依存: なし
// 利用側: replaceAbbreviations.js

(function (root) {
  "use strict";

  /**
   * ============================================================
   * 1) 通常マップ（広範囲）
   *    - 空白 / ハイフン / アンダースコアを normalize() で吸収
   *    - 例: "rrc setup request" / "rrc-setup-request" / "rrc_setup_request"
   *      -> 同一キー扱い
   * ============================================================
   */
  var replaceMap = {
    // ============================================================
    // 基本 / プラットフォーム / OS
    // ============================================================
    gnb: "gNB",
    pa5j: "PA5J",

    ipados: "iPadOS",
    macos: "macOS",
    watchos: "watchOS",
    tvos: "tvOS",
    android: "Android",
    androidos: "Android",
    wearos: "Wear OS",
    harmonyos: "HarmonyOS",

    wifi: "Wi-Fi",
    wlan: "WLAN",
    bluetooth: "Bluetooth",
    nfc: "NFC",
    uwb: "UWB",

    gnss: "GNSS",
    gps: "GPS",
    glonass: "GLONASS",
    galileo: "Galileo",
    beidou: "BeiDou",
    qzss: "QZSS",

    appleid: "Apple ID",
    icloud: "iCloud",
    airdrop: "AirDrop",
    airplay: "AirPlay",
    facetime: "FaceTime",
    imessage: "iMessage",
    appstore: "App Store",
    googleplay: "Google Play",
    playstore: "Play Store",

    // ============================================================
    // 標準化団体 / 仕様文書
    // ============================================================
    "3gpp": "3GPP",
    etsi: "ETSI",
    itu: "ITU",
    ietf: "IETF",
    ieee: "IEEE",

    // ============================================================
    // RAT / 無線方式 / 3GPP世代
    // ============================================================
    ltea: "LTE-A",
    lteadvanced: "LTE-Advanced",
    lteapro: "LTE-A Pro",

    nr: "NR",
    "5g": "5G",
    "5gc": "5GC",

    emtc: "eMTC",
    nbiot: "NB-IoT",
    catm1: "Cat-M1",
    cat1: "Cat-1",
    redcap: "RedCap",

    umts: "UMTS",
    wcdma: "WCDMA",
    hspa: "HSPA",
    hsdpa: "HSDPA",
    hsupa: "HSUPA",
    gsm: "GSM",
    geran: "GERAN",
    utran: "UTRAN",
    eutran: "E-UTRAN",
    eutra: "E-UTRA",

    embb: "eMBB",
    urllc: "URLLC",
    mmtc: "mMTC",
    ciot: "CIoT",
    lpwa: "LPWA",

    // ============================================================
    // RAN ノード / 構成 / O-RAN / WG
    // ============================================================
    enb: "eNB",
    ngenb: "ng-eNB",
    enodeb: "eNodeB",
    gnodeb: "gNodeB",

    cucp: "CU-CP",
    cuup: "CU-UP",
    gnbdu: "gNB-DU",
    gnbcu: "gNB-CU",
    gnbcucp: "gNB-CU-CP",
    gnbcuup: "gNB-CU-UP",

    oran: "O-RAN",
    ric: "RIC",
    nearrtric: "Near-RT RIC",
    nonrtric: "Non-RT RIC",
    smo: "SMO",
    e2ap: "E2AP",
    a1: "A1",
    o1: "O1",
    o2: "O2",

    ran1: "RAN1",
    ran2: "RAN2",
    ran3: "RAN3",
    sa2: "SA2",
    sa3: "SA3",
    ct1: "CT1",
    ct3: "CT3",

    // ============================================================
    // セル / CA・DC / TAG・TMG
    // ============================================================
    mrdc: "MR-DC",
    endc: "EN-DC",
    nrdc: "NR-DC",
    nedc: "NE-DC",

    mcg: "MCG",
    scg: "SCG",
    spcell: "SpCell",
    pscell: "PSCell",
    pcell: "PCell",
    scell: "SCell",
    servingcell: "ServingCell",

    tag: "TAG",
    ptag: "pTAG",
    stag: "sTAG",
    pstag: "psTAG",
    tmg: "TMG",
    tmgs: "TMGs",
    trp: "TRP",
    multitrp: "multi-TRP",

    // ============================================================
    // 物理層 / 多重 / 変調 / チャネル / 信号
    // ============================================================
    mimo: "MIMO",
    beamforming: "Beamforming",
    tdd: "TDD",
    fdd: "FDD",
    ofdm: "OFDM",
    ofdma: "OFDMA",
    scfdma: "SC-FDMA",
    qam: "QAM",
    qpsk: "QPSK",
    bpsk: "BPSK",
    ldpc: "LDPC",
    polar: "Polar",
    fec: "FEC",

    smtc: "SMTC",
    mgrp: "MGRP",

    pucch: "PUCCH",
    pusch: "PUSCH",
    pdcch: "PDCCH",
    pdsch: "PDSCH",
    pbch: "PBCH",
    prach: "PRACH",
    srs: "SRS",
    ssb: "SSB",
    csirs: "CSI-RS",
    dmrs: "DMRS",
    ptrs: "PTRS",
    prs: "PRS",
    trs: "TRS",

    dci: "DCI",
    uci: "UCI",
    harq: "HARQ",
    bwp: "BWP",
    coreset: "CORESET",
    searchspace: "SearchSpace",
    mcs: "MCS",
    tbs: "TBS",
    cqi: "CQI",
    pmi: "PMI",
    cri: "CRI",


    // ランダムアクセス / 同期
    rach: "RACH",
    cfra: "CFRA",
    cbra: "CBRA",
    timingadvance: "Timing Advance",
    preamble: "Preamble",

    // ============================================================
    // 測定 / 品質
    // ============================================================
    rsrp: "RSRP",
    rsrq: "RSRQ",
    sinr: "SINR",
    snr: "SNR",

    // ============================================================
    // L2/L3 / RAN プロトコル / インタフェース
    // ============================================================
    rlc: "RLC",
    mac: "MAC",
    pdcp: "PDCP",
    rrc: "RRC",
    nas: "NAS",

    s1ap: "S1AP",
    x2ap: "X2AP",
    xnap: "XnAP",
    ngap: "NGAP",
    f1ap: "F1AP",
    e1ap: "E1AP",

    s1: "S1",
    x2: "X2",
    xn: "Xn",
    e1: "E1",
    f1: "F1",
    f1c: "F1-C",
    f1u: "F1-U",
    ngu: "NG-U",

    n1: "N1",
    n2: "N2",
    n3: "N3",
    n4: "N4",
    n6: "N6",
    n8: "N8",
    n10: "N10",
    n11: "N11",
    n12: "N12",
    n13: "N13",
    n14: "N14",
    n15: "N15",
    n16: "N16",

    gtp: "GTP",
    gtpc: "GTP-C",
    gtpu: "GTP-U",
    sctp: "SCTP",
    udp: "UDP",
    tcp: "TCP",
    ipv4: "IPv4",
    ipv6: "IPv6",

    // ============================================================
    // RRC 状態 / 手順 / シグナリング（重要）
    // ============================================================
    idle: "IDLE",
    inactive: "INACTIVE",
    connected: "CONNECTED",

    mib: "MIB",
    sib: "SIB",
    sib1: "SIB1",
    sib2: "SIB2",
    sib3: "SIB3",
    sib4: "SIB4",
    sib5: "SIB5",

    "rrc setup request": "RRC Setup Request",
    "rrc setup": "RRC Setup",
    "rrc setup complete": "RRC Setup Complete",
    "rrc reject": "RRC Reject",

    "rrc resume request": "RRC Resume Request",
    "rrc resume": "RRC Resume",
    "rrc resume complete": "RRC Resume Complete",

    "rrc release": "RRC Release",

    "rrc reconfiguration": "RRC Reconfiguration",
    "rrc reconfiguration complete": "RRC Reconfiguration Complete",

    "rrc reestablishment request": "RRC Reestablishment Request",
    "rrc reestablishment": "RRC Reestablishment",
    "rrc reestablishment complete": "RRC Reestablishment Complete",
    "rrc reestablishment reject": "RRC Reestablishment Reject",

    "security mode command": "Security Mode Command",
    "security mode complete": "Security Mode Complete",
    "security mode failure": "Security Mode Failure",

    "ue capability enquiry": "UE Capability Enquiry",
    "ue capability information": "UE Capability Information",
    "measurement report": "Measurement Report",
    "counter check": "Counter Check",
    "counter check response": "Counter Check Response",
    "ul information transfer": "UL Information Transfer",
    "dl information transfer": "DL Information Transfer",

    "rrc connection reconfiguration": "RRCConnectionReconfiguration",
    "rrc connection reconfiguration complete": "RRCConnectionReconfigurationComplete",
    "rrc connection reestablishment": "RRCConnectionReestablishment",
    "rrc connection reestablishment request": "RRCConnectionReestablishmentRequest",
    "rrc connection reestablishment complete": "RRCConnectionReestablishmentComplete",
    "rrc connection release": "RRCConnectionRelease",
    "rrc connection setup": "RRCConnectionSetup",
    "rrc connection setup complete": "RRCConnectionSetupComplete",
    "rrc connection request": "RRCConnectionRequest",

    // ============================================================
    // NAS / Mobility / 状態遷移 / 手順
    // ============================================================
    registration: "Registration",
    deregistration: "Deregistration",
    attach: "Attach",
    detach: "Detach",
    paging: "Paging",
    handover: "Handover",
    reselection: "Reselection",
    rlf: "RLF",
    "radio link failure": "Radio Link Failure",
    rlm: "RLM",
    bfd: "BFD",
    outofsync: "out-of-sync",
    insync: "in-sync",
    meas: "Meas",
    measid: "MeasId",
    measobject: "MeasObject",
    reportconfig: "ReportConfig",
    eventa1: "Event A1",
    eventa2: "Event A2",
    eventa3: "Event A3",
    eventa4: "Event A4",
    eventa5: "Event A5",

    // ============================================================
    // EPC / 5GC / IMS / 音声
    // ============================================================
    epc: "EPC",
    mme: "MME",
    sgw: "SGW",
    sgateway: "SGW",
    pgw: "PGW",
    pgateway: "PGW",
    hss: "HSS",
    pcrf: "PCRF",

    amf: "AMF",
    smf: "SMF",
    upf: "UPF",
    ausf: "AUSF",
    udm: "UDM",
    udr: "UDR",
    pcf: "PCF",
    nrf: "NRF",
    nef: "NEF",
    nssf: "NSSF",
    ladn: "LADN",
    smsf: "SMSF",
    sepp: "SEPP",
    scp: "SCP",
    bsf: "BSF",
    nwdaf: "NWDAF",
    ims: "IMS",
    volte: "VoLTE",
    vonr: "VoNR",
    vowifi: "VoWiFi",
    csfb: "CSFB",
    srvcc: "SRVCC",
    esrvcc: "eSRVCC",

    // ============================================================
    // QoS / セッション / ベアラ
    // ============================================================
    qos: "QoS",
    qci: "QCI",
    "5qi": "5QI",
    qfi: "QFI",
    ambr: "AMBR",
    gbr: "GBR",
    nongbr: "non-GBR",
    arp: "ARP",
    reflectiveqos: "Reflective QoS",
    pdu: "PDU",
    "pdu session": "PDU Session",
    srb: "SRB",
    drb: "DRB",
    erab: "E-RAB",

    // ============================================================
    // 識別子 / 加入者情報 / セル識別
    // ============================================================
    esim: "eSIM",
    euicc: "eUICC",
    imsi: "IMSI",
    imei: "IMEI",
    meid: "MEID",
    iccid: "ICCID",
    msisdn: "MSISDN",
    guti: "GUTI",
    supi: "SUPI",
    suci: "SUCI",
    tmsi: "TMSI",
    ptmsi: "P-TMSI",
    stmsi: "S-TMSI",
    plmn: "PLMN",
    tai: "TAI",
    cgi: "CGI",
    ecgi: "ECGI",
    ncgi: "NCGI",
    pci: "PCI",
    arfcn: "ARFCN",
    earfcn: "EARFCN",
    nrarfcn: "NR-ARFCN",

    // ============================================================
    // セキュリティ / 鍵 / 認証
    // ============================================================
    aka: "AKA",
    eap: "EAP",
    tls: "TLS",
    kasme: "KASME",
    kamf: "KAMF",
    kenb: "KeNB",
    kgnb: "KgNB",
    knas: "KNAS",
    knasenc: "KNASenc",
    knasint: "KNASint",
    krrcenc: "KRRCenc",
    krrcint: "KRRCint",
    kupenc: "KUPenc",

    // ============================================================
    // スライシング / 仮想化 / MEC / クラウド
    // ============================================================
    snssai: "S-NSSAI",
    sst: "SST",
    nsi: "NSI",

    nfv: "NFV",
    sdn: "SDN",
    vnf: "VNF",
    cnf: "CNF",

    // ============================================================
    // V2X / NTN / サイドリンク
    // ============================================================
    v2x: "V2X",
    ltev2x: "LTE-V2X",
    nrv2x: "NR-V2X",
    sidelink: "Sidelink",
    pc5: "PC5",
    ntn: "NTN",

    // ============================================================
    // 開発 / API / 一般IT
    // ============================================================
    api: "API",
    sdk: "SDK",
    cli: "CLI",
    gui: "GUI",
    json: "JSON",
    xml: "XML",
    yaml: "YAML",
    http: "HTTP",
    https: "HTTPS",
    rest: "REST",
    grpc: "gRPC",
    websocket: "WebSocket",
    sql: "SQL",
    nosql: "NoSQL",
    uuid: "UUID",
    jwt: "JWT",
    oauth: "OAuth",
    oauth2: "OAuth 2.0",
    openid: "OpenID",
    openidconnect: "OpenID Connect",
  };

  /**
   * ============================================================
   * 2) 条件付き短縮語マップ（誤爆しやすい短語を分離）
   *    - 単語境界相当（前後が英数字でない）でのみ適用
   *    - 通常 replaceMap に入れない
   * ============================================================
   */
  var conditionalShortMap = {
    tr: "TR",
    ts: "TS",
    ip: "IP",
    ho: "HO",
    ra: "RA",

    du: "DU",
    cu: "CU",
    ue: "UE",
    ca: "CA",
    dc: "DC",

    rv: "RV",
    ri: "RI",
    li: "LI",
    ta: "TA",

    af: "AF",
    dn: "DN",
    ck: "CK",
    ik: "IK",
    sd: "SD",

    ui: "UI",
    ux: "UX",

    cce: "CCE",
    mec: "MEC",
    lte: "LTE",

    ble: "BLE",

    ngc: "NG-C",

    ios: "iOS",
    ms: "ms",
  };

  /**
   * `nr` が `snr` を壊さないようにするキー（境界制御必須）
   * 例: "snr" 内の "nr" は不適用 / "nr rrc" の "nr" は適用
   */
  var boundarySensitiveKeys = new Set(["nr"]);

  root.telecomAbbreviations = Object.freeze({
    replaceMap: Object.freeze(replaceMap),
    conditionalShortMap: Object.freeze(conditionalShortMap),
    boundarySensitiveKeys: boundarySensitiveKeys,
  });
})(globalThis);
