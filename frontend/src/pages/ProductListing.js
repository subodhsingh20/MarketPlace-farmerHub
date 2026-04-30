import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import FarmerMap from "../components/FarmerMap";
import FadeIn from "../components/FadeIn";
import ContactOptions from "../components/ContactOptions";
import ProductImage from "../components/ProductImage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import {
  formatAvailableStock,
  formatPriceWithUnit,
  formatQuantityWithUnit,
} from "../utils/productUnits";
import {
  getAllProducts,
  getNearestFarmers,
  getNearbyProducts,
  getProductsByFarmer,
} from "../services/authService";
import { getSpeechToTextConfig } from "../services/speechToTextService";

const IBM_VOICE_SEARCH_SAMPLE_RATE = 16000;
const IBM_VOICE_SEARCH_MODEL = "en-US_BroadbandModel";

function downsampleFloat32Buffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate >= inputSampleRate) {
    return buffer;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  let bufferOffset = 0;

  for (let i = 0; i < newLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;

    for (; bufferOffset < nextOffset && bufferOffset < buffer.length; bufferOffset += 1) {
      sum += buffer[bufferOffset];
      count += 1;
    }

    const sample = count > 0 ? sum / count : 0;
    const clampedSample = Math.max(-1, Math.min(1, sample));
    result[i] = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff;
  }

  return result;
}

function normalizeVoiceText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .trim();
}

function buildSpeechKeywords(products) {
  const keywordSet = new Set([
    "product",
    "products",
    "vegetable",
    "vegetables",
    "fruit",
    "fruits",
    "grain",
    "grains",
    "pulse",
    "pulses",
    "organic",
    "fresh",
  ]);

  products.forEach((product) => {
    const name = normalizeVoiceText(product?.name).toLowerCase();
    const category = normalizeVoiceText(product?.category).toLowerCase();

    if (name) {
      keywordSet.add(name);
      name.split(/\s+/).forEach((token) => {
        if (token.length > 2) {
          keywordSet.add(token);
        }
      });
    }

    if (category) {
      keywordSet.add(category);
    }
  });

  return Array.from(keywordSet).slice(0, 100);
}

function ProductListing() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToCart, cartItems } = useCart();
  const isCustomer = user?.role === "customer";
  const isFarmer = user?.role === "farmer";
  const normalizeCategoryParam = (value) => {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (normalizedValue === "vegetable" || normalizedValue === "vegetables") {
      return "vegetable";
    }

    if (normalizedValue === "pulse" || normalizedValue === "pulses") {
      return "pulses";
    }

    return "all";
  };
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(() =>
    normalizeCategoryParam(searchParams.get("category"))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestFarmerId, setNearestFarmerId] = useState(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const resultsSectionRef = useRef(null);
  const userLocationRef = useRef(null);
  const { socket } = useSocket();
  const speechSocketRef = useRef(null);
  const speechStreamRef = useRef(null);
  const speechAudioContextRef = useRef(null);
  const speechProcessorRef = useRef(null);
  const speechGainRef = useRef(null);
  const speechSourceRef = useRef(null);
  const speechStopRequestedRef = useRef(false);
  const speechKeywords = useMemo(() => buildSpeechKeywords(products), [products]);
  const loadVisibleProducts = useCallback(
    async (currentLocation = userLocationRef.current, showLoader = true) => {
      if (isFarmer && user?.id) {
        try {
          if (showLoader) {
            setIsLoading(true);
          }
          setError("");
          const response = await getProductsByFarmer(user.id);
          setProducts(response.data.products || []);
        } catch (requestError) {
          setError(
            requestError.response?.data?.message || "Failed to load your catalog."
          );
        } finally {
          if (showLoader) {
            setIsLoading(false);
          }
        }

        return;
      }

      try {
        if (showLoader) {
          setIsLoading(true);
        }
        setError("");
        const response = currentLocation
          ? await getNearbyProducts(currentLocation.latitude, currentLocation.longitude)
          : await getAllProducts();
        setProducts(response.data.products || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load products.");
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [isFarmer, user?.id]
  );

  useEffect(() => {
    setSelectedCategory(normalizeCategoryParam(searchParams.get("category")));
  }, [searchParams]);

  useEffect(() => {
    return () => {
      speechStopRequestedRef.current = true;

      if (speechSocketRef.current) {
        try {
          speechSocketRef.current.close();
        } catch (_error) {
          // Ignore cleanup errors.
        }
        speechSocketRef.current = null;
      }

      if (speechProcessorRef.current) {
        try {
          speechProcessorRef.current.disconnect();
        } catch (_error) {
          // Ignore cleanup errors.
        }
        speechProcessorRef.current = null;
      }

      if (speechSourceRef.current) {
        try {
          speechSourceRef.current.disconnect();
        } catch (_error) {
          // Ignore cleanup errors.
        }
        speechSourceRef.current = null;
      }

      if (speechGainRef.current) {
        try {
          speechGainRef.current.disconnect();
        } catch (_error) {
          // Ignore cleanup errors.
        }
        speechGainRef.current = null;
      }

      if (speechStreamRef.current) {
        speechStreamRef.current.getTracks().forEach((track) => track.stop());
        speechStreamRef.current = null;
      }

      if (speechAudioContextRef.current) {
        speechAudioContextRef.current.close().catch(() => {});
        speechAudioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isFarmer && user?.id) {
      loadVisibleProducts(null, true);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      loadVisibleProducts(null, true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserLocation(currentLocation);
        userLocationRef.current = currentLocation;
        setLocationError("");
        loadVisibleProducts(currentLocation, true);
      },
      (geolocationError) => {
        setLocationError(
          geolocationError.message || "Location access denied. Showing all products instead."
        );
        loadVisibleProducts(null, true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, [isFarmer, loadVisibleProducts, user?.id]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleProductsUpdated = () => {
      loadVisibleProducts(undefined, false);
    };

    socket.on("products_updated", handleProductsUpdated);

    return () => {
      socket.off("products_updated", handleProductsUpdated);
    };
  }, [loadVisibleProducts, socket]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadVisibleProducts(undefined, false);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadVisibleProducts]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = product.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || product.category === selectedCategory;

        return matchesSearch && matchesCategory;
      }),
    [products, searchTerm, selectedCategory]
  );

  const getCartQuantity = (productId) =>
    cartItems.find((item) => item._id === productId)?.quantityInCart || 0;

  const searchSuggestions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return [];
    }

    return products
      .filter((product) => {
        const matchesName = product.name.toLowerCase().includes(normalizedSearch);
        const matchesCategory =
          selectedCategory === "all" || product.category === selectedCategory;

        return matchesName && matchesCategory;
      })
      .slice(0, 5);
  }, [products, searchTerm, selectedCategory]);

  const recommendedProducts = useMemo(() => {
    if (!isCustomer || products.length === 0) {
      return [];
    }

    const categoryTotals = new Map();

    cartItems.forEach((item) => {
      const category = String(item?.category || "").trim().toLowerCase();

      if (!category) {
        return;
      }

      categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(item.quantityInCart || 1));
    });

    const favoriteCategory = Array.from(categoryTotals.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || "";
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...products]
      .map((product) => {
        const productName = String(product.name || "").toLowerCase();
        const productCategory = String(product.category || "").toLowerCase();
        let score = 0;

        if (normalizedSearch && productName.includes(normalizedSearch)) {
          score += 6;
        }

        if (favoriteCategory && productCategory === favoriteCategory) {
          score += 5;
        }

        if (selectedCategory !== "all" && productCategory === selectedCategory) {
          score += 4;
        }

        if (nearestFarmerId && String(product.farmerId?._id || product.farmerId) === nearestFarmerId) {
          score += 3;
        }

        const stockScore = Math.min(Number(product.quantity || 0), 50) / 10;
        const ratingScore = Number(product.averageRating || 0) * 1.2;
        const distanceScore =
          typeof product.distanceInMeters === "number" && Number.isFinite(product.distanceInMeters)
            ? Math.max(0, 4 - product.distanceInMeters / 5000)
            : 0;

        score += stockScore + ratingScore + distanceScore;

        return { product, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
      .map((entry) => entry.product);
  }, [cartItems, isCustomer, nearestFarmerId, products, searchTerm, selectedCategory]);

  const handleSuggestionSelect = (productName) => {
    if (isVoiceListening) {
      stopVoiceSearch();
    }

    setSearchTerm(productName);

    window.requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const stopVoiceSearch = () => {
    speechStopRequestedRef.current = true;
    setIsVoiceListening(false);

    if (speechSocketRef.current) {
      try {
        speechSocketRef.current.close();
      } catch (_error) {
        // Ignore cleanup errors.
      }
      speechSocketRef.current = null;
    }

    if (speechProcessorRef.current) {
      try {
        speechProcessorRef.current.disconnect();
      } catch (_error) {
        // Ignore cleanup errors.
      }
      speechProcessorRef.current = null;
    }

    if (speechSourceRef.current) {
      try {
        speechSourceRef.current.disconnect();
      } catch (_error) {
        // Ignore cleanup errors.
      }
      speechSourceRef.current = null;
    }

    if (speechGainRef.current) {
      try {
        speechGainRef.current.disconnect();
      } catch (_error) {
        // Ignore cleanup errors.
      }
      speechGainRef.current = null;
    }

    if (speechStreamRef.current) {
      speechStreamRef.current.getTracks().forEach((track) => track.stop());
      speechStreamRef.current = null;
    }

    if (speechAudioContextRef.current) {
      speechAudioContextRef.current.close().catch(() => {});
      speechAudioContextRef.current = null;
    }
  };

  const handleVoiceTranscript = (transcript, isFinal) => {
    const cleanedTranscript = normalizeVoiceText(transcript);

    if (!cleanedTranscript) {
      return;
    }

    setSearchTerm(cleanedTranscript);

    if (isFinal) {
      stopVoiceSearch();
    }
  };

  const startVoiceSearch = async () => {
    if (isVoiceListening) {
      stopVoiceSearch();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setVoiceError("Your browser does not support microphone transcription.");
      return;
    }

    try {
      setVoiceError("");
      setVoiceStatus("Preparing IBM speech recognition...");
      speechStopRequestedRef.current = false;

      const { data } = await getSpeechToTextConfig();
      const wsUrl = data?.wsUrl;
      const accessToken = data?.accessToken;
      const model = data?.model || IBM_VOICE_SEARCH_MODEL;

      if (!wsUrl || !accessToken) {
        throw new Error("IBM speech-to-text is not configured correctly.");
      }

      const audioContext = new window.AudioContext();
      await audioContext.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const socketUrl = new URL(`${wsUrl.replace(/\/$/, "")}/v1/recognize`);
      socketUrl.searchParams.set("access_token", accessToken);
      socketUrl.searchParams.set("model", model);

      const socket = new WebSocket(socketUrl.toString());
      socket.binaryType = "arraybuffer";

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const gain = audioContext.createGain();
      gain.gain.value = 0;

      speechAudioContextRef.current = audioContext;
      speechStreamRef.current = stream;
      speechSocketRef.current = socket;
      speechSourceRef.current = source;
      speechProcessorRef.current = processor;
      speechGainRef.current = gain;

      const sendAudioChunk = (event) => {
        if (speechStopRequestedRef.current || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        const floatBuffer = event.inputBuffer.getChannelData(0);
        const pcmBuffer = downsampleFloat32Buffer(
          floatBuffer,
          audioContext.sampleRate,
          IBM_VOICE_SEARCH_SAMPLE_RATE
        );

        if (pcmBuffer.length > 0) {
          socket.send(pcmBuffer.buffer);
        }
      };

      socket.onopen = () => {
        if (speechStopRequestedRef.current) {
          return;
        }

        setIsVoiceListening(true);
        setVoiceStatus("Listening... speak a product name.");

        const startMessage = {
          action: "start",
          "content-type": `audio/l16;rate=${IBM_VOICE_SEARCH_SAMPLE_RATE};channels=1`,
          interim_results: true,
          smart_formatting: true,
          profanity_filter: true,
          inactivity_timeout: -1,
          end_of_phrase_silence_time: 0.4,
          background_audio_suppression: 0.4,
          model,
        };

        if (model !== "en-US" && speechKeywords.length > 0) {
          startMessage.keywords = speechKeywords;
          startMessage.keywords_threshold = 0.25;
        }

        socket.send(JSON.stringify(startMessage));

        source.connect(processor);
        processor.connect(gain);
        gain.connect(audioContext.destination);
        processor.onaudioprocess = sendAudioChunk;
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== "string") {
          return;
        }

        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch (_parseError) {
          return;
        }

        if (payload?.error) {
          setVoiceError(payload.error || "IBM speech recognition returned an error.");
          setVoiceStatus("");
          stopVoiceSearch();
          return;
        }

        const result = payload?.results?.[0];
        const transcript = result?.alternatives?.[0]?.transcript || "";

        if (!transcript) {
          return;
        }

        handleVoiceTranscript(transcript, Boolean(result?.final));

        if (result?.final) {
          setVoiceStatus("Search updated from your voice input.");
        }
      };

      socket.onerror = () => {
        if (!speechStopRequestedRef.current) {
          setVoiceError("The speech-to-text connection failed.");
          setVoiceStatus("");
          stopVoiceSearch();
        }
      };

      socket.onclose = () => {
        setIsVoiceListening(false);

        if (!speechStopRequestedRef.current) {
          setVoiceStatus((currentStatus) => currentStatus || "Voice search stopped.");
        }

        if (speechProcessorRef.current) {
          try {
            speechProcessorRef.current.disconnect();
          } catch (_error) {
            // Ignore cleanup errors.
          }
        }

        if (speechSourceRef.current) {
          try {
            speechSourceRef.current.disconnect();
          } catch (_error) {
            // Ignore cleanup errors.
          }
        }

        if (speechGainRef.current) {
          try {
            speechGainRef.current.disconnect();
          } catch (_error) {
            // Ignore cleanup errors.
          }
        }

        if (speechStreamRef.current) {
          speechStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        if (speechAudioContextRef.current) {
          speechAudioContextRef.current.close().catch(() => {});
        }

        speechSocketRef.current = null;
        speechProcessorRef.current = null;
        speechSourceRef.current = null;
        speechGainRef.current = null;
        speechStreamRef.current = null;
        speechAudioContextRef.current = null;
      };
    } catch (requestError) {
      stopVoiceSearch();
      setVoiceError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to start voice search."
      );
      setVoiceStatus("");
    }
  };

  const farmerGroups = useMemo(() => {
    const groups = new Map();

    filteredProducts.forEach((product) => {
      const farmerId = product.farmerId?._id || product.farmerId;
      const latitude = product.location?.latitude;
      const longitude = product.location?.longitude;

      if (!farmerId || typeof latitude !== "number" || typeof longitude !== "number") {
        return;
      }

      if (!groups.has(farmerId)) {
        groups.set(farmerId, {
          id: farmerId,
          farmerName: product.farmerId?.name || "Unknown farmer",
          latitude,
          longitude,
          products: [],
          distanceInMeters: product.distanceInMeters,
        });
      }

      groups.get(farmerId).products.push(product);
    });

    return Array.from(groups.values());
  }, [filteredProducts]);

  const selectedFarmerGroup =
    farmerGroups.find((group) => group.id === selectedFarmerId) || null;

  useEffect(() => {
    if (isFarmer || !userLocation) {
      return;
    }

    const loadNearestFarmers = async () => {
      try {
        const response = await getNearestFarmers(
          userLocation.latitude,
          userLocation.longitude
        );
        const nearestFarmer = response.data.nearestFarmer;

        if (nearestFarmer?.id) {
          setNearestFarmerId(String(nearestFarmer.id));
          setSelectedFarmerId((current) => current || String(nearestFarmer.id));
        }
      } catch (_error) {
        setNearestFarmerId(null);
      }
    };

    loadNearestFarmers();
  }, [isFarmer, userLocation]);

  useEffect(() => {
    if (isFarmer) {
      return;
    }

    if (nearestFarmerId && farmerGroups.some((group) => group.id === nearestFarmerId)) {
      setSelectedFarmerId((current) => current || nearestFarmerId);
      return;
    }

    if (!selectedFarmerId && farmerGroups.length > 0) {
      setSelectedFarmerId(farmerGroups[0].id);
      return;
    }

    if (
      selectedFarmerId &&
      farmerGroups.length > 0 &&
      !farmerGroups.some((group) => group.id === selectedFarmerId)
    ) {
      setSelectedFarmerId(farmerGroups[0].id);
    }
  }, [farmerGroups, isFarmer, nearestFarmerId, selectedFarmerId]);

  // Farmer View
  if (isFarmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900">
        <FadeIn>
          <div className="responsive-shell">
            {/* Header */}
            <FadeIn delay={0.1}>
              <div className="premium-panel mb-6 overflow-hidden p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">My catalog</span>
                    <h1 className="responsive-title mb-5 font-bold !text-black">
                      Review your active product listings.
                    </h1>
                    <p className="responsive-copy max-w-2xl !text-slate-300">
                      Farmers see only their own catalog here, so this page stays focused on inventory visibility instead of buyer-only actions like cart and purchase flow.
                    </p>
                  </div>

                  <Link
                    to="/farmer-dashboard"
                    className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-base font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:from-emerald-700 hover:to-green-700 hover:shadow-2xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage in Dashboard
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Stats Cards */}
            <FadeIn delay={0.2}>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="premium-panel p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 sm:h-11 sm:w-11">
                      <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-slate-600">Total Products</h3>
                  <p className="text-xl font-bold text-slate-950 sm:text-2xl">{products.length}</p>
                  <p className="mt-1 text-xs text-slate-500">In your catalog</p>
                </div>

                <div className="premium-panel p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 sm:h-11 sm:w-11">
                      <svg className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-slate-600">Total Stock</h3>
                  <p className="text-xl font-bold text-slate-950 sm:text-2xl">
                    {products.reduce((total, product) => total + Number(product.quantity || 0), 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Combined kg and litre listed</p>
                </div>

                <div className="premium-panel p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 sm:h-11 sm:w-11">
                      <svg className="h-5 w-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-slate-600">Combined Value</h3>
                  <p className="text-xl font-bold text-slate-950 sm:text-2xl">
                    Rs. {products.reduce((total, product) => total + Number(product.price || 0), 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Visible price points</p>
                </div>
              </div>
            </FadeIn>

            {error && (
              <FadeIn delay={0.1}>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-8">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-red-700">{error}</p>
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Products Grid */}
            <FadeIn delay={0.3}>
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <svg className="h-8 w-8 animate-spin text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">Loading your catalog...</h3>
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">No products listed yet</h3>
                  <p className="text-slate-300">Add products from the farmer dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {products.map((product) => (
                    <div key={product._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-xl transition-all duration-300 hover:shadow-2xl md:hover:scale-[1.01]">
                      <div className="aspect-w-1 aspect-h-1">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          productName={product.name}
                          className="w-full h-48 object-cover"
                          fallbackClassName="w-full h-48 object-cover p-4"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="mb-1 text-lg font-semibold text-slate-950">{product.name}</h3>
                            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full capitalize">
                              {product.category}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-emerald-600">{formatPriceWithUnit(product.price, product)}</span>
                          </div>
                          <div className="text-sm text-slate-600">
                            <p>Available: {formatQuantityWithUnit(product.quantity, product)}</p>
                          </div>
                        </div>

                        <div className="mb-4 text-xs text-slate-500">
                          <p>📍 {product.location?.latitude}, {product.location?.longitude}</p>
                        </div>

                        <Link
                          to="/farmer-dashboard"
                          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md inline-flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit in Dashboard
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FadeIn>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Customer View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-slate-100">
      <FadeIn>
        <div className="responsive-shell">
          {/* Header */}
          <FadeIn delay={0.1}>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <span className="responsive-chip mb-5 inline-block border border-emerald-400/20 bg-emerald-400/15 text-emerald-100">Marketplace</span>
                  <h1 className="responsive-title mb-5 font-bold !text-white">
                    Browse fresh products from nearby farms.
                  </h1>
                  <p className="responsive-copy max-w-2xl !text-slate-300">
                    Search by product, compare categories, view sellers on the map, and quickly move from discovery to contact and checkout.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-[0_20px_60px_rgba(16,185,129,0.28)]">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">{filteredProducts.length}</div>
                    <div className="text-emerald-100 text-sm">Visible Listings</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Search and Filters */}
          <FadeIn delay={0.2}>
            <div className="mb-6 rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Search Products
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          if (!event.target.value.trim()) {
                            setVoiceStatus("");
                          }
                        }}
                        placeholder="Search by product name..."
                        className="premium-input w-full px-4 py-3 pr-36 text-slate-100 placeholder-slate-400"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={startVoiceSearch}
                          className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white ${
                            isVoiceListening
                              ? "border-emerald-300/50 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)]"
                              : "border-slate-200 bg-slate-900 text-emerald-100 shadow-[0_8px_20px_rgba(15,23,42,0.16)] hover:border-emerald-300/40 hover:bg-emerald-600 hover:text-white"
                          }`}
                          aria-pressed={isVoiceListening}
                          aria-label={isVoiceListening ? "Stop voice search" : "Start voice search"}
                          title={isVoiceListening ? "Stop voice search" : "Search by voice"}
                        >
                          {isVoiceListening && (
                            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                          )}
                          <svg
                            className={`relative h-5 w-5 stroke-[2.2] ${isVoiceListening ? "animate-pulse" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {isVoiceListening ? (
                              <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v4" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 22h8" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6" />
                              </>
                            ) : (
                              <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11a7 7 0 0014 0" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v4" />
                              </>
                            )}
                          </svg>
                        </button>
                        {(searchTerm || isVoiceListening) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isVoiceListening) {
                                stopVoiceSearch();
                              }

                              setSearchTerm("");
                              setVoiceStatus("");
                            }}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
                              isVoiceListening
                                ? "border-rose-300/50 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_24px_rgba(244,63,94,0.24)] hover:from-rose-600 hover:to-red-700 focus:ring-rose-500"
                                : "border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_rgba(148,163,184,0.16)] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 focus:ring-emerald-500"
                            }`}
                            aria-label={isVoiceListening ? "Stop voice search and clear" : "Clear search"}
                            title={isVoiceListening ? "Stop voice search and clear" : "Clear search"}
                          >
                            <svg className="h-5 w-5 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {isVoiceListening ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
                              )}
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${
                          isVoiceListening
                          ? "bg-emerald-500/15 text-emerald-100"
                          : "bg-white/8 text-slate-200"
                        }`}
                      >
                        {isVoiceListening ? "Listening to IBM Speech to Text" : "Voice search ready"}
                      </span>
                    </div>

                    {(voiceStatus || voiceError) && (
                        <p className={`text-sm ${voiceError ? "text-rose-200" : "text-slate-300"}`}>
                        {voiceError || voiceStatus}
                      </p>
                    )}

                    {searchTerm.trim() && (
                        <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/40 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-semibold text-white">
                            Matching products
                          </p>
                            <span className="text-xs font-medium text-emerald-100 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-400/20">
                            {filteredProducts.length} found
                          </span>
                        </div>

                        {searchSuggestions.length > 0 ? (
                          <div className="space-y-2">
                            {searchSuggestions.map((product) => (
                              <button
                                key={product._id}
                                type="button"
                                onClick={() => handleSuggestionSelect(product.name)}
                                className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-3 text-left text-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20 hover:shadow-md"
                              >
                                <div className="flex items-center gap-3">
                                  <ProductImage
                                    src={product.imageUrl}
                                    alt={product.name}
                                    productName={product.name}
                                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                                    fallbackClassName="h-14 w-14 flex-shrink-0 rounded-lg object-cover p-1"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-white">
                                      {product.name}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                      <span className="font-semibold text-emerald-200">
                                        {formatPriceWithUnit(product.price, product)}
                                      </span>
                                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold capitalize text-emerald-100">
                                        {product.category}
                                      </span>
                                      <span className="text-xs sm:text-sm">
                                        {formatQuantityWithUnit(product.quantity, product)}
                                      </span>
                                    </div>
                                  </div>
                                  <svg className="hidden sm:block w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-emerald-300/20 bg-white/5 px-4 py-5 text-sm text-slate-300">
                            No quick matches for "{searchTerm.trim()}". Try another product name or category.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="premium-input w-full px-4 py-3 text-slate-100"
                  >
                    <option value="all">All Categories</option>
                    <option value="vegetable">Vegetables</option>
                    <option value="pulses">Pulses</option>
                  </select>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Stats Cards */}
          <FadeIn delay={0.3}>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/72 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 sm:h-11 sm:w-11">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                  <h3 className="mb-1 text-sm font-medium text-slate-200">Total Products</h3>
                  <p className="text-xl font-bold text-white sm:text-2xl">{products.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Loaded from database</p>
              </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/72 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 sm:h-11 sm:w-11">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                  <h3 className="mb-1 text-sm font-medium text-slate-200">Farmer Locations</h3>
                  <p className="text-xl font-bold text-white sm:text-2xl">{farmerGroups.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Available on map</p>
              </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/72 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 sm:h-11 sm:w-11">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
                  <h3 className="mb-1 text-sm font-medium text-slate-200">Current Filter</h3>
                  <p className="text-xl font-bold capitalize text-white sm:text-2xl">
                  {selectedCategory === "all" ? "All" : selectedCategory}
                </p>
                  <p className="text-xs text-slate-400 mt-1">Category focus</p>
              </div>
            </div>
          </FadeIn>

          {/* Error Messages */}
          {error && (
            <FadeIn delay={0.1}>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {locationError && (
            <FadeIn delay={0.1}>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-yellow-700 font-medium">{locationError}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {recommendedProducts.length > 0 && (
            <FadeIn delay={0.15}>
              <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-[0_20px_80px_rgba(15,23,42,0.28)]">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
                      Personalized
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {searchTerm.trim() ? "Matches that fit your taste" : "Recommended for you"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      Faster access to the items you are most likely to buy, ranked by your current search, cart history, nearby sellers, and stock freshness.
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Live recommendations
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {recommendedProducts.map((product, index) => (
                    <motion.button
                      key={product._id}
                      type="button"
                      onClick={() => handleSuggestionSelect(product.name)}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/6 text-left text-slate-100 shadow-lg backdrop-blur-sm transition-colors hover:border-emerald-300/20"
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.35, delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                        <div className="relative h-40 overflow-hidden bg-slate-800">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          productName={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          fallbackClassName="h-full w-full object-cover p-5"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                        <span className="absolute left-3 top-3 inline-flex rounded-full bg-slate-950/85 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200 shadow-sm">
                          {product.category}
                        </span>
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-white">
                              {product.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-300">
                              {product.farmerId?.name || "Unknown farmer"}
                            </p>
                          </div>
                          <svg className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-300 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-sm font-bold text-emerald-100">
                            {formatPriceWithUnit(product.price, product)}
                          </span>
                            <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-xs font-semibold text-slate-200">
                            {formatQuantityWithUnit(product.quantity, product)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            {/* Sidebar */}
            <div className="min-w-0 space-y-8">
              {/* Map Section */}
              <FadeIn delay={0.4}>
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Discover by Location</h2>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {userLocation ? "Live" : "Ready"}
                    </span>
                  </div>
                  <FarmerMap
                    farmerGroups={farmerGroups}
                    nearestFarmerId={nearestFarmerId}
                    onMarkerSelect={setSelectedFarmerId}
                    selectedFarmerId={selectedFarmerId}
                    userLocation={userLocation}
                  />
                </div>
              </FadeIn>

              {/* Selected Farmer */}
              <FadeIn delay={0.5}>
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Selected Seller</h2>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {selectedFarmerGroup ? selectedFarmerGroup.products.length : 0} products
                    </span>
                  </div>

                  {selectedFarmerGroup ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                        <h3 className="mb-2 font-semibold text-white">{selectedFarmerGroup.farmerName}</h3>
                        <div className="space-y-1 text-sm text-slate-300">
                          <p>📍 {selectedFarmerGroup.latitude}, {selectedFarmerGroup.longitude}</p>
                          {typeof selectedFarmerGroup.distanceInMeters === "number" && (
                            <p>📏 {(selectedFarmerGroup.distanceInMeters / 1000).toFixed(2)} km away</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedFarmerGroup.products.map((product) => (
                          <div key={product._id} className="rounded-lg border border-white/10 bg-white/6 p-4">
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              productName={product.name}
                              className="w-full h-24 object-cover rounded-lg mb-3"
                              fallbackClassName="w-full h-24 object-cover rounded-lg mb-3 p-2"
                            />
                            <h4 className="mb-1 font-semibold text-white">{product.name}</h4>
                            <p className="mb-2 text-sm text-slate-300">{formatPriceWithUnit(product.price, product)} • {formatAvailableStock(product.quantity, product)}</p>
                            <ContactOptions
                              farmerId={product.farmerId?._id}
                              farmerName={product.farmerId?.name || selectedFarmerGroup.farmerName}
                              phone={product.farmerId?.phone}
                              compact
                              chatLabel="Chat"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                        <svg className="h-6 w-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-white">Click a farmer marker</h3>
                      <p className="text-xs text-slate-300">Inspect the nearest seller from the map.</p>
                    </div>
                  )}
                </div>
              </FadeIn>
            </div>

            {/* Products Grid */}
            <div className="min-w-0">
              <FadeIn delay={0.6}>
                <div ref={resultsSectionRef} className="flex items-center justify-between mb-6 scroll-mt-28">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{filteredProducts.length} Results</h2>
                    <p className="text-slate-300">Showing products that match your current filters.</p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
                      <svg className="w-8 h-8 text-slate-300 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-white">Loading products...</h3>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-white">No products match your search</h3>
                    <p className="text-slate-300">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <div key={product._id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 shadow-xl transition-all duration-300 hover:shadow-2xl md:hover:scale-[1.01]">
                        <div className="aspect-w-1 aspect-h-1">
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.name}
                            productName={product.name}
                            className="w-full h-48 object-cover"
                            fallbackClassName="w-full h-48 object-cover p-4"
                          />
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="mb-1 text-lg font-semibold text-white">{product.name}</h3>
                              <span className="inline-block px-3 py-1 border border-emerald-400/20 bg-emerald-500/15 text-emerald-100 text-xs font-semibold rounded-full capitalize">
                                {product.category}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-emerald-300">{formatPriceWithUnit(product.price, product)}</span>
                            </div>
                            <div className="space-y-1 text-sm text-slate-300">
                              <p>👨‍🌾 {product.farmerId?.name || "Unknown farmer"}</p>
                              <p>📦 Available: {formatQuantityWithUnit(product.quantity, product)}</p>
                            </div>
                          </div>
                          <div className="mb-4">
                            <ContactOptions
                              farmerId={product.farmerId?._id}
                              farmerName={product.farmerId?.name || "Farmer"}
                              phone={product.farmerId?.phone}
                              chatLabel="Chat with Farmer"
                            />
                          </div>

{/* Add to Cart / Login */}
                          {isCustomer ? (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={getCartQuantity(product._id) >= product.quantity}
                              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {getCartQuantity(product._id) >= product.quantity ? (
                                <div className="flex items-center justify-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Max Added
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                  Add to Cart
                                </div>
                              )}
                            </button>
                          ) : (
                            <Link
                              to="/login"
                              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md inline-flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                              Login to Order
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FadeIn>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default ProductListing;
